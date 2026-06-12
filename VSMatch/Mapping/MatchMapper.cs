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
            m.Sport,
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
                    GetSportRating(p.User, m.Sport),
                    p.RatingDelta,
                    p.JoinedAt))
                .ToList(),
            m.Status,
            m.TeamAScore,
            m.TeamBScore,
            m.ResultSubmittedAt,
            m.CreatedAt,
            m.UpdatedAt);

    private static double GetSportRating(User? user, Domain.Sports.SportKind sport)
    {
        if (user is null) return Domain.Matches.RatingCalculator.InitialRating;
        var found = user.Ratings.FirstOrDefault(r => r.Sport == sport);
        return found?.Rating ?? Domain.Matches.RatingCalculator.InitialRating;
    }
}
