using VSMatch.Data.Entities;

namespace VSMatch.Dtos.Matches;

public record MatchDto(
    Guid Id,
    Guid CourtId,
    string CourtName,
    Guid CreatedByUserId,
    string InviteCode,
    string InviteUrl,
    string Title,
    string? Description,
    DateTime StartsAtUtc,
    int DurationMinutes,
    int MaxPlayers,
    int CurrentPlayers,
    IReadOnlyList<MatchPlayerDto> Players,
    MatchStatus Status,
    DateTime CreatedAt,
    DateTime? UpdatedAt
);

public record MatchPlayerDto(
    Guid UserId,
    string DisplayName,
    DateTime JoinedAt
);
