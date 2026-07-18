using Microsoft.EntityFrameworkCore;
using VSMatch.Data;
using VSMatch.Data.Entities;

namespace VSMatch.Services.Matches;

/// <summary>
/// Авто-отмена «зависших» матчей, чтобы площадки не были заняты вечно:
/// — Scheduled/Ready без активности дольше часа (активность = создание/вход игрока);
/// — InProgress, забытые дольше 6 часов (начали и не ввели счёт).
/// После отмены пересчитывает занятость затронутых площадок.
/// </summary>
public class StaleMatchCleaner : BackgroundService
{
    private static readonly TimeSpan CheckInterval = TimeSpan.FromMinutes(5);
    private static readonly TimeSpan PendingTtl = TimeSpan.FromHours(1);
    private static readonly TimeSpan InProgressTtl = TimeSpan.FromHours(6);

    private readonly IServiceProvider _services;
    private readonly IMatchEventHub _events;
    private readonly ILogger<StaleMatchCleaner> _log;

    public StaleMatchCleaner(IServiceProvider services, IMatchEventHub events, ILogger<StaleMatchCleaner> log)
    {
        _services = services;
        _events = events;
        _log = log;
    }

    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        // Дать API прогреться (миграции и т.п.)
        try { await Task.Delay(TimeSpan.FromSeconds(30), ct); }
        catch (OperationCanceledException) { return; }

        while (!ct.IsCancellationRequested)
        {
            try
            {
                await CleanupOnceAsync(ct);
            }
            catch (OperationCanceledException) when (ct.IsCancellationRequested) { break; }
            catch (Exception ex)
            {
                _log.LogError(ex, "StaleMatchCleaner: ошибка очистки; продолжаем по расписанию.");
            }

            try { await Task.Delay(CheckInterval, ct); }
            catch (OperationCanceledException) { break; }
        }
    }

    private async Task CleanupOnceAsync(CancellationToken ct)
    {
        using var scope = _services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var now = DateTime.UtcNow;
        var pendingDeadline = now - PendingTtl;
        var liveDeadline = now - InProgressTtl;

        var stale = await db.Matches
            .Where(m =>
                ((m.Status == MatchStatus.Scheduled || m.Status == MatchStatus.Ready)
                    && (m.UpdatedAt ?? m.CreatedAt) < pendingDeadline)
                || (m.Status == MatchStatus.InProgress
                    && (m.UpdatedAt ?? m.CreatedAt) < liveDeadline))
            .ToListAsync(ct);

        if (stale.Count == 0) return;

        foreach (var match in stale)
        {
            _log.LogInformation(
                "StaleMatchCleaner: авто-отмена матча {MatchId} ({Status}, активность {LastActivity:u})",
                match.Id, match.Status, match.UpdatedAt ?? match.CreatedAt);
            match.Status = MatchStatus.Cancelled;
            match.UpdatedAt = now;
        }

        // Сначала фиксируем отмены — иначе запрос пересчёта ниже увидит в БД старые статусы.
        await db.SaveChangesAsync(ct);

        // Пересчитать занятость всех затронутых площадок.
        var courtIds = stale.Select(m => m.CourtId).Distinct().ToList();
        var courts = await db.Courts.Where(c => courtIds.Contains(c.Id)).ToListAsync(ct);
        foreach (var court in courts)
        {
            var hasActive = await db.Matches.AnyAsync(m =>
                m.CourtId == court.Id &&
                (m.Status == MatchStatus.Scheduled || m.Status == MatchStatus.Ready || m.Status == MatchStatus.InProgress), ct);
            court.IsFree = !hasActive;
        }

        await db.SaveChangesAsync(ct);
        await _events.PublishChangedAsync(ct);

        _log.LogInformation("StaleMatchCleaner: отменено матчей: {Count}", stale.Count);
    }
}
