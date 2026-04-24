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

    public async Task<AuthResponse> HandleVkIdCallbackAsync(string code, string state, CancellationToken ct)
    {
        if (!_stateStore.TryGet(state, out var verifier))
            throw new InvalidOperationException("Invalid or expired state.");

        _stateStore.Remove(state);

        var token = await _vk.ExchangeCodeAsync(code, verifier, ct);
        var info = await _vk.GetUserInfoAsync(token.AccessToken, ct);

        var user = await _users.GetByVkUserIdAsync(info.UserId, ct);
        if (user is null)
        {
            user = new User
            {
                Id = Guid.NewGuid(),
                VkUserId = info.UserId,
                DisplayName = BuildDisplayName(info),
                Email = info.Email,
                CreatedAt = DateTime.UtcNow,
            };
            await _users.AddAsync(user, ct);
            await _users.SaveChangesAsync(ct);
        }

        return _tokens.CreateToken(user);
    }

    private static string BuildDisplayName(VkIdUserInfo info)
    {
        var parts = new[] { info.FirstName, info.LastName }
            .Where(s => !string.IsNullOrWhiteSpace(s));
        var name = string.Join(' ', parts).Trim();
        return string.IsNullOrEmpty(name) ? $"vk_{info.UserId}" : name;
    }
}
