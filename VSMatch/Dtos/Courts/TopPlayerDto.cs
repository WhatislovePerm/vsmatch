namespace VSMatch.Dtos.Courts;

public record TopPlayerDto(
    Guid UserId,
    string DisplayName,
    double Rating,
    int MatchCount
);
