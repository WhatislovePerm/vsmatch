namespace VSMatch.Dtos.Auth;

public record AuthResponse(string AccessToken, DateTimeOffset ExpiresAt);
