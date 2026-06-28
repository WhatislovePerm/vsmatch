using VSMatch.Domain.Sports;

namespace VSMatch.Domain.Matches;

/// <summary>
/// Рейтинг на базе Elo с поправками под виды спорта:
/// — K-фактор зависит от числа сыгранных матчей (новички двигаются быстрее);
/// — за крупную победу бонус-множитель (свой порог на каждый спорт);
/// — ничья даёт небольшой минус обоим, чтобы играли на победу.
/// </summary>
public static class RatingCalculator
{
    /// <summary>Стартовый рейтинг нового игрока (тир «Бронза»).</summary>
    public const double InitialRating = 500;

    /// <summary>Штраф обоим за ничью (note: «до крови грызлись за победу»).</summary>
    private const double DrawPenalty = 5;

    public static double Expected(double rating, double opponentRating)
        => 1.0 / (1.0 + Math.Pow(10, (opponentRating - rating) / 400.0));

    public static double KFactor(int gamesPlayed)
        => gamesPlayed < 10 ? 60
         : gamesPlayed < 30 ? 40
         : gamesPlayed < 100 ? 25
         : 15;

    /// <param name="outcome">1 — победа, 0.5 — ничья, 0 — поражение (для самого игрока).</param>
    public static double CalculateDelta(
        double rating,
        double opponentRating,
        int gamesPlayed,
        SportKind sport,
        int ownScore,
        int opponentScore,
        double outcome)
    {
        var expected = Expected(rating, opponentRating);
        var k = KFactor(gamesPlayed);

        if (outcome == 0.5)
            return k * (0.5 - expected) - DrawPenalty;

        if (outcome >= 1)
            return k * (1 - expected) * DiffBonus(sport, ownScore, opponentScore);

        return k * (0 - expected);
    }

    /// <summary>Множитель за разгром: чем крупнее победа, тем больше очков.</summary>
    private static double DiffBonus(SportKind sport, int winnerScore, int loserScore)
    {
        var diff = winnerScore - loserScore;

        (int Threshold, double Bonus)[] table = sport switch
        {
            SportKind.Football    => new[] { (5, 1.3), (3, 1.15) },
            SportKind.Basketball  => new[] { (10, 1.25), (5, 1.1) },
            SportKind.TableTennis => new[] { (6, 1.2), (3, 1.1) },
            _ => Array.Empty<(int, double)>(),
        };

        foreach (var (threshold, bonus) in table)
            if (diff >= threshold)
                return bonus;

        return 1.0;
    }
}
