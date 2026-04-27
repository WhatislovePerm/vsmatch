using VSMatch.Dtos.Auth;

namespace VSMatch.Services.Auth;

public interface IAuthService
{
    string BuildVkIdAuthorizeUrl();
    Task<AuthResponse> HandleVkIdCallbackAsync(string code, string state, string? deviceId, CancellationToken ct);
    Task<AuthResponse> ExchangeVkIdCodeAsync(VkIdExchangeRequest req, CancellationToken ct);
}
