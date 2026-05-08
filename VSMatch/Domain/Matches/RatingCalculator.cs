using VSMatch.Data.Entities;

namespace VSMatch.Domain.Matches;

public static class RatingCalculator
{
    public static double CalculateDelta(MatchTeam team, int teamAScore, int teamBScore, int goals, int assists)
    {
        var teamScore = team == MatchTeam.TeamA ? teamAScore : teamBScore;
        var opponentScore = team == MatchTeam.TeamA ? teamBScore : teamAScore;
        var resultDelta = teamScore == opponentScore
            ? 5
            : teamScore > opponentScore ? 25 : -15;

        return resultDelta + goals * 3 + assists * 2;
    }
}
