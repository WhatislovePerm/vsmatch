using VSMatch.Data.Entities;
using VSMatch.Dtos.Matches;

namespace VSMatch.Mapping;

public static class MatchMapper
{
    public static MatchDto ToDto(Match m) =>
        new(
            m.Id,
            m.CourtId,
            m.Court?.Name ?? string.Empty,
            m.CreatedByUserId,
            m.InviteCode,
            $"/matches/join/{m.InviteCode}",
            m.Title,
            m.Description,
            m.TeamAName,
            m.TeamBName,
            m.StartsAtUtc,
            m.DurationMinutes,
            m.MaxPlayers,
            m.Players.Count,
            m.Players
                .OrderBy(p => p.JoinedAt)
                .Select(p => new MatchPlayerDto(
                    p.UserId,
                    p.User?.DisplayName ?? p.UserId.ToString(),
                    p.Team,
                    p.Goals,
                    p.Assists,
                    p.User?.Rating ?? 1000,
                    p.RatingDelta,
                    p.JoinedAt))
                .ToList(),
            m.Status,
            m.TeamAScore,
            m.TeamBScore,
            m.ResultSubmittedAt,
            m.CreatedAt,
            m.UpdatedAt);
}
