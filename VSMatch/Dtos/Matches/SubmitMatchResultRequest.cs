namespace VSMatch.Dtos.Matches;

public record SubmitMatchResultRequest(
    int TeamAScore,
    int TeamBScore,
    IReadOnlyList<PlayerMatchStatsRequest> Players
);

public record PlayerMatchStatsRequest(
    Guid UserId,
    int Goals,
    int Assists
);
