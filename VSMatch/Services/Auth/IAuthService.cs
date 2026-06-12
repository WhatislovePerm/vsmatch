using VSMatch.Dtos.Auth;

namespace VSMatch.Services.Auth;

public interface IAuthService
{
    string BuildVkIdAuthorizeUrl(string? inviteCode = null);
    Task<MeDto> GetMeAsync(Guid userId, CancellationToken ct = default);
    Task<VkIdCallbackResult> HandleVkIdCallbackAsync(string code, string state, string? deviceId, CancellationToken ct);
    Task<AuthResponse> ExchangeVkIdCodeAsync(VkIdExchangeRequest req, CancellationToken ct);
    Task<AuthResponse> UpdateProfileAsync(Guid userId, UpdateProfileRequest req, CancellationToken ct);
}
