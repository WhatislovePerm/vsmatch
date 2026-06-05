using VSMatch.Domain.Sports;

namespace VSMatch.Dtos.Auth;

public record MeDto(
    Guid UserId,
    string Name,
    string VkUserId,
    string? Email,
    bool IsAdmin,
    IReadOnlyDictionary<SportKind, double> Ratings
);
