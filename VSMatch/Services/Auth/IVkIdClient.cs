namespace VSMatch.Services.Auth;

public record VkIdTokenResult(string AccessToken, int ExpiresIn, string? UserId);

public record VkIdUserInfo(string UserId, string? Email, string? FirstName, string? LastName);

public interface IVkIdClient
{
    Task<VkIdTokenResult> ExchangeCodeAsync(string code, string codeVerifier, CancellationToken ct);
    Task<VkIdUserInfo> GetUserInfoAsync(string accessToken, CancellationToken ct);
}
