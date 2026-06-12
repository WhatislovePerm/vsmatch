using Microsoft.Extensions.Options;
using VSMatch.Data.Entities;
using VSMatch.Data.Repositories;
using VSMatch.Domain;
using VSMatch.Domain.Moderation;
using VSMatch.Dtos.Auth;
using VSMatch.Options;

namespace VSMatch.Services.Auth;

public class AuthService : IAuthService
{
    private const string AuthorizationEndpoint = "https://id.vk.ru/authorize";

    private readonly VkIdOptions _opt;
    private readonly IVkIdStateStore _stateStore;
    private readonly IVkIdClient _vk;
    private readonly IUserRepository _users;
    private readonly ITokenService _tokens;
    private readonly IContentModerator _moderator;

    public AuthService(
        IOptions<VkIdOptions> opt,
        IVkIdStateStore stateStore,
        IVkIdClient vk,
        IUserRepository users,
        ITokenService tokens,
        IContentModerator moderator)
    {
        _opt = opt.Value;
        _stateStore = stateStore;
        _vk = vk;
        _users = users;
        _tokens = tokens;
        _moderator = moderator;
    }

    public string BuildVkIdAuthorizeUrl(string? inviteCode = null)
    {
        var state = Guid.NewGuid().ToString("N");
        var verifier = Pkce.GenerateCodeVerifier();
        var challenge = Pkce.CreateS256CodeChallenge(verifier);

        // invite хранится на сервере: VK может завершить логин в другом браузере,
        // где localStorage с инвайтом недоступен (Telegram webview → Safari).
        _stateStore.Save(state, verifier, NormalizeInvite(inviteCode), DateTimeOffset.UtcNow.AddMinutes(5));

        return $"{AuthorizationEndpoint}" +
               $"?response_type=code" +
               $"&client_id={Uri.EscapeDataString(_opt.ClientId)}" +
               $"&redirect_uri={Uri.EscapeDataString(_opt.RedirectUri)}" +
               $"&scope={Uri.EscapeDataString(_opt.Scope)}" +
               $"&state={Uri.EscapeDataString(state)}" +
               $"&code_challenge={Uri.EscapeDataString(challenge)}" +
               $"&code_challenge_method=S256";
    }

    public async Task<MeDto> GetMeAsync(Guid userId, CancellationToken ct = default)
    {
        var user = await _users.GetProfileByIdAsync(userId, ct)
            ?? throw new NotFoundException("Пользователь не найден.");

        // Включаем все спорты со стартовым рейтингом для тех, по которым ещё не играл.
        var ratings = Domain.Sports.SportCatalog.All.Keys.ToDictionary(
            sport => sport,
            sport => user.Ratings.FirstOrDefault(r => r.Sport == sport)?.Rating
                     ?? Domain.Matches.RatingCalculator.InitialRating);

        return new MeDto(user.Id, user.DisplayName, user.VkUserId, user.Email, user.IsAdmin, ratings);
    }

    public async Task<VkIdCallbackResult> HandleVkIdCallbackAsync(string code, string state, string? deviceId, CancellationToken ct)
    {
        if (!_stateStore.TryGet(state, out var verifier, out var inviteCode))
            throw new ValidationException("Сессия авторизации истекла. Попробуйте ещё раз.");

        _stateStore.Remove(state);

        var token = await _vk.ExchangeCodeAsync(code, verifier, deviceId, redirectUriOverride: null, ct);

        // user_id приходит уже в ответе от token exchange.
        // user_info опционален — если VK его не отдаст, логин всё равно пройдёт.
        var info = await _vk.TryGetUserInfoAsync(token.AccessToken, ct);

        var vkUserId = info?.UserId ?? token.UserId
            ?? throw new ValidationException("VK не вернул идентификатор пользователя.");

        var user = await _users.GetByVkUserIdAsync(vkUserId, ct);
        if (user is null)
        {
            user = new User
            {
                Id = Guid.NewGuid(),
                VkUserId = vkUserId,
                DisplayName = BuildDisplayName(info, vkUserId),
                Email = info?.Email,
                CreatedAt = DateTime.UtcNow,
            };
            await _users.AddAsync(user, ct);
            await _users.SaveChangesAsync(ct);
        }

        return new VkIdCallbackResult(_tokens.CreateToken(user), inviteCode);
    }

    public async Task<AuthResponse> ExchangeVkIdCodeAsync(VkIdExchangeRequest req, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(req.Code))
            throw new ValidationException("Не передан код авторизации.");
        if (string.IsNullOrWhiteSpace(req.CodeVerifier))
            throw new ValidationException("Не передан codeVerifier.");
        if (string.IsNullOrWhiteSpace(req.DeviceId))
            throw new ValidationException("Не передан deviceId.");

        var token = await _vk.ExchangeCodeAsync(req.Code, req.CodeVerifier, req.DeviceId, req.RedirectUri, ct);
        var info = await _vk.TryGetUserInfoAsync(token.AccessToken, ct);

        var vkUserId = info?.UserId ?? token.UserId
            ?? throw new ValidationException("VK не вернул идентификатор пользователя.");

        var user = await _users.GetByVkUserIdAsync(vkUserId, ct);
        if (user is null)
        {
            user = new User
            {
                Id = Guid.NewGuid(),
                VkUserId = vkUserId,
                DisplayName = BuildDisplayName(info, vkUserId),
                Email = info?.Email,
                CreatedAt = DateTime.UtcNow,
            };
            await _users.AddAsync(user, ct);
            await _users.SaveChangesAsync(ct);
        }

        return _tokens.CreateToken(user);
    }

    public async Task<AuthResponse> UpdateProfileAsync(Guid userId, UpdateProfileRequest req, CancellationToken ct)
    {
        var name = req.DisplayName?.Trim();
        if (string.IsNullOrWhiteSpace(name))
            throw new ValidationException("Укажите логин.");
        if (name.Length > 64)
            throw new ValidationException("Логин — не более 64 символов.");
        _moderator.EnsureClean(name, "Имя");

        var user = await _users.GetByIdAsync(userId, ct)
            ?? throw new NotFoundException("Пользователь не найден.");

        user.DisplayName = name;
        _users.Update(user);
        await _users.SaveChangesAsync(ct);

        return _tokens.CreateToken(user);
    }

    /// <summary>Инвайт попадает в redirect-URL — пропускаем только безопасный формат кода.</summary>
    private static string? NormalizeInvite(string? inviteCode)
    {
        var code = inviteCode?.Trim();
        if (string.IsNullOrEmpty(code) || code.Length > 32) return null;
        return code.All(char.IsLetterOrDigit) ? code : null;
    }

    private static string BuildDisplayName(VkIdUserInfo? info, string vkUserId)
    {
        var parts = new[] { info?.FirstName, info?.LastName }
            .Where(s => !string.IsNullOrWhiteSpace(s));
        var name = string.Join(' ', parts).Trim();
        return string.IsNullOrEmpty(name) ? $"vk_{vkUserId}" : name;
    }
}
