using VSMatch.Data.Entities;
using VSMatch.Domain;

namespace VSMatch.Domain.Matches;

public static class MatchLifecycle
{
    public static bool IsActive(MatchStatus status)
        => status is MatchStatus.Scheduled or MatchStatus.Ready or MatchStatus.InProgress;

    public static MatchStatus ValidateTransition(MatchStatus current, MatchStatus next)
    {
        if (current == next) return next;
        if (current is MatchStatus.Cancelled or MatchStatus.Completed)
            throw new InvalidMatchStateException("Финальный статус матча менять нельзя.");

        var allowed = current switch
        {
            MatchStatus.Scheduled => next is MatchStatus.Ready or MatchStatus.Cancelled,
            MatchStatus.Ready => next is MatchStatus.InProgress or MatchStatus.Cancelled,
            MatchStatus.InProgress => next is MatchStatus.Cancelled,
            _ => false,
        };

        if (!allowed)
            throw new InvalidMatchStateException($"Недопустимый переход статуса: {current} → {next}.");

        return next;
    }
}
