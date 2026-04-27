namespace VSMatch.Dtos.Auth;

public record VkIdExchangeRequest(
    string Code,
    string CodeVerifier,
    string? State,
    string DeviceId,
    string? RedirectUri
);
