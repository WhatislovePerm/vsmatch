using VSMatch.Data.Entities;

namespace VSMatch.Dtos.Matches;

public record UpdateMatchRequest(
    Guid CourtId,
    string Title,
    string? Description,
    DateTime StartsAtUtc,
    int DurationMinutes,
    int MaxPlayers,
    MatchStatus Status
);
