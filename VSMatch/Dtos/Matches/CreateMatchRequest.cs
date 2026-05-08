namespace VSMatch.Dtos.Matches;

public record CreateMatchRequest(
    Guid CourtId,
    string Title,
    string? Description,
    string? TeamAName,
    string? TeamBName,
    DateTime StartsAtUtc,
    int DurationMinutes,
    int MaxPlayers
);
