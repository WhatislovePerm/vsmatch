using VSMatch.Domain.Sports;

namespace VSMatch.Dtos.Admin;

public record AdminStatsDto(
    int Users,
    int Courts,
    int Matches,
    int ActiveMatches,
    int CompletedMatches,
    int CancelledMatches,
    int NewFeedback,
    IReadOnlyList<AdminTopPlayerDto> TopPlayers
);

public record AdminTopPlayerDto(
    Guid UserId,
    string DisplayName,
    SportKind Sport,
    double Rating
);
