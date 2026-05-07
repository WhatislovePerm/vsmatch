namespace VSMatch.Dtos.Matches;

public record CreateMatchRequest(
    Guid CourtId,
    string Title,
    string? Description,
    DateTime StartsAtUtc,
    int DurationMinutes,
    int MaxPlayers
);
