using Microsoft.Extensions.Options;
using VSMatch.Data.Entities;
using VSMatch.Data.Repositories;
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

    public AuthService(
        IOptions<VkIdOptions> opt,
        IVkIdStateStore stateStore,
        IVkIdClient vk,
        IUserRepository users,
        ITokenService tokens)
    {
        _opt = opt.Value;
        _stateStore = stateStore;
        _vk = vk;
        _users = users;
        _tokens = tokens;
    }

    public string BuildVkIdAuthorizeUrl()
    {
        var state = Guid.NewGuid().ToString("N");
        var verifier = Pkce.GenerateCodeVerifier();
        var challenge = Pkce.CreateS256CodeChallenge(verifier);

        _stateStore.Save(state, verifier, DateTimeOffset.UtcNow.AddMinutes(5));

        return $"{AuthorizationEndpoint}" +
               $"?response_type=code" +
               $"&client_id={Uri.EscapeDataString(_opt.ClientId)}" +
               $"&redirect_uri={Uri.EscapeDataString(_opt.RedirectUri)}" +
               $"&scope={Uri.EscapeDataString(_opt.Scope)}" +
               $"&state={Uri.EscapeDataString(state)}" +
               $"&code_challenge={Uri.EscapeDataString(challenge)}" +
               $"&code_challenge_method=S256";
    }

    public async Task<AuthResponse> HandleVkIdCallbackAsync(string code, string state, string? deviceId, CancellationToken ct)
    {
        if (!_stateStore.TryGet(state, out var verifier))
            throw new InvalidOperationException("Invalid or expired state.");

        _stateStore.Remove(state);

        var token = await _vk.ExchangeCodeAsync(code, verifier, deviceId, redirectUriOverride: null, ct);

        // user_id приходит уже в ответе от token exchange.
        // user_info опционален — если VK его не отдаст, логин всё равно пройдёт.
        var info = await _vk.TryGetUserInfoAsync(token.AccessToken, ct);

        var vkUserId = info?.UserId ?? token.UserId
            ?? throw new InvalidOperationException("VK ID did not return user_id.");

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

    public async Task<AuthResponse> ExchangeVkIdCodeAsync(VkIdExchangeRequest req, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(req.Code))
            throw new InvalidOperationException("code is required.");
        if (string.IsNullOrWhiteSpace(req.CodeVerifier))
            throw new InvalidOperationException("codeVerifier is required.");
        if (string.IsNullOrWhiteSpace(req.DeviceId))
            throw new InvalidOperationException("deviceId is required.");

        var token = await _vk.ExchangeCodeAsync(req.Code, req.CodeVerifier, req.DeviceId, req.RedirectUri, ct);
        var info = await _vk.TryGetUserInfoAsync(token.AccessToken, ct);

        var vkUserId = info?.UserId ?? token.UserId
            ?? throw new InvalidOperationException("VK ID did not return user_id.");

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
            throw new InvalidOperationException("Display name is required.");
        if (name.Length > 64)
            throw new InvalidOperationException("Display name must be 64 characters or less.");

        var user = await _users.GetByIdAsync(userId, ct)
            ?? throw new InvalidOperationException("User not found.");

        user.DisplayName = name;
        _users.Update(user);
        await _users.SaveChangesAsync(ct);

        return _tokens.CreateToken(user);
    }

    private static string BuildDisplayName(VkIdUserInfo? info, string vkUserId)
    {
        var parts = new[] { info?.FirstName, info?.LastName }
            .Where(s => !string.IsNullOrWhiteSpace(s));
        var name = string.Join(' ', parts).Trim();
        return string.IsNullOrEmpty(name) ? $"vk_{vkUserId}" : name;
    }
}
