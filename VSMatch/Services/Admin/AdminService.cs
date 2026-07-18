using Microsoft.EntityFrameworkCore;
using VSMatch.Data;
using VSMatch.Data.Entities;
using VSMatch.Domain.Sports;
using VSMatch.Dtos.Admin;

namespace VSMatch.Services.Admin;

public class AdminService : IAdminService
{
    private readonly AppDbContext _db;

    public AdminService(AppDbContext db) => _db = db;

    public async Task<AdminStatsDto> GetStatsAsync(CancellationToken ct = default)
    {
        var activeStatuses = new[] { MatchStatus.Scheduled, MatchStatus.Ready, MatchStatus.InProgress };

        // Топ-5 по каждому спорту — фронт раскладывает по табам.
        var topPlayers = new List<AdminTopPlayerDto>();
        foreach (var sport in SportCatalog.All.Keys)
        {
            topPlayers.AddRange(await _db.UserRatings
                .AsNoTracking()
                .Include(r => r.User)
                .Where(r => r.Sport == sport)
                .OrderByDescending(r => r.Rating)
                .Take(5)
                .Select(r => new AdminTopPlayerDto(
                    r.UserId,
                    r.User != null ? r.User.DisplayName : r.UserId.ToString(),
                    r.Sport,
                    r.Rating))
                .ToListAsync(ct));
        }

        return new AdminStatsDto(
            Users: await _db.Users.CountAsync(ct),
            Courts: await _db.Courts.CountAsync(ct),
            Matches: await _db.Matches.CountAsync(ct),
            ActiveMatches: await _db.Matches.CountAsync(m => activeStatuses.Contains(m.Status), ct),
            CompletedMatches: await _db.Matches.CountAsync(m => m.Status == MatchStatus.Completed, ct),
            CancelledMatches: await _db.Matches.CountAsync(m => m.Status == MatchStatus.Cancelled, ct),
            NewFeedback: await _db.Feedbacks.CountAsync(f => f.Status == FeedbackStatus.New, ct),
            TopPlayers: topPlayers
        );
    }
}
