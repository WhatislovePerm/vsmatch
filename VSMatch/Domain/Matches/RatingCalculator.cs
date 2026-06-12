using VSMatch.Data.Entities;

namespace VSMatch.Domain.Matches;

public static class RatingCalculator
{
    /// <summary>Стартовый рейтинг нового игрока (тир «Бронза»).</summary>
    public const double InitialRating = 750;

    public static double CalculateDelta(MatchTeam team, int teamAScore, int teamBScore, int goals, int assists)
    {
        var teamScore = team == MatchTeam.TeamA ? teamAScore : teamBScore;
        var opponentScore = team == MatchTeam.TeamA ? teamBScore : teamAScore;

        // Бонус за личную статистику капится, иначе договорные матчи с большим
        // счётом дают бесконечный буст обоим игрокам.
        var bonus = goals * 3 + assists * 2;

        if (teamScore > opponentScore)
            return 25 + Math.Min(bonus, 15);          // победа: +25..+40

        if (teamScore == opponentScore)
            return 5 + Math.Min(bonus, 10);           // ничья: +5..+15

        return -15 + Math.Min(bonus, 10);             // поражение: всегда минус, -15..-5
    }
}
