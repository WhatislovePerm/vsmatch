namespace VSMatch.Dtos.Auth;

public record MeDto(
    Guid UserId,
    string Name,
    string VkUserId,
    string? Email,
    double Rating
);
