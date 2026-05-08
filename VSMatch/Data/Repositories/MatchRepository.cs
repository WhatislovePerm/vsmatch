using Microsoft.EntityFrameworkCore;
using VSMatch.Data.Entities;

namespace VSMatch.Data.Repositories;

public class MatchRepository : BaseRepository<Match>, IMatchRepository
{
    public MatchRepository(AppDbContext db) : base(db) { }

    public override Task<Match?> GetByIdAsync(Guid id, CancellationToken ct = default)
        => Set.Include(m => m.Court)
            .Include(m => m.Players)
            .ThenInclude(p => p.User)
            .FirstOrDefaultAsync(m => m.Id == id, ct);

    public override async Task<IReadOnlyList<Match>> ListAsync(CancellationToken ct = default)
        => await Set.Include(m => m.Court)
            .Include(m => m.Players)
            .ThenInclude(p => p.User)
            .AsNoTracking()
            .OrderBy(m => m.StartsAtUtc)
            .ToListAsync(ct);

    public async Task<IReadOnlyList<Match>> ListPagedAsync(int page = 1, int pageSize = 100, CancellationToken ct = default)
        => await Set.Include(m => m.Court)
            .Include(m => m.Players)
            .ThenInclude(p => p.User)
            .AsNoTracking()
            .OrderBy(m => m.StartsAtUtc)
            .Skip((NormalizePage(page) - 1) * NormalizePageSize(pageSize, 100))
            .Take(NormalizePageSize(pageSize, 100))
            .ToListAsync(ct);

    public async Task<IReadOnlyList<Match>> ListByCourtAsync(Guid courtId, int page = 1, int pageSize = 100, CancellationToken ct = default)
        => await Set.Include(m => m.Court)
            .Include(m => m.Players)
            .ThenInclude(p => p.User)
            .AsNoTracking()
            .Where(m => m.CourtId == courtId)
            .OrderBy(m => m.StartsAtUtc)
            .Skip((NormalizePage(page) - 1) * NormalizePageSize(pageSize, 100))
            .Take(NormalizePageSize(pageSize, 100))
            .ToListAsync(ct);

    public async Task<IReadOnlyList<Match>> ListHistoryByUserAsync(Guid userId, int page = 1, int pageSize = 50, CancellationToken ct = default)
        => await Set.Include(m => m.Court)
            .Include(m => m.Players)
            .ThenInclude(p => p.User)
            .AsNoTracking()
            .Where(m =>
                (m.Status == MatchStatus.Completed || m.Status == MatchStatus.Cancelled) &&
                m.Players.Any(p => p.UserId == userId))
            .OrderByDescending(m => m.ResultSubmittedAt ?? m.UpdatedAt ?? m.CreatedAt)
            .Skip((NormalizePage(page) - 1) * NormalizePageSize(pageSize, 50))
            .Take(NormalizePageSize(pageSize, 50))
            .ToListAsync(ct);

    public Task<Match?> GetByInviteCodeAsync(string inviteCode, CancellationToken ct = default)
        => Set.Include(m => m.Court)
            .Include(m => m.Players)
            .ThenInclude(p => p.User)
            .FirstOrDefaultAsync(m => m.InviteCode == inviteCode, ct);

    public Task<bool> HasActiveMatchForCourtAsync(Guid courtId, Guid? exceptMatchId = null, CancellationToken ct = default)
        => Set.AnyAsync(m =>
            m.CourtId == courtId &&
            (!exceptMatchId.HasValue || m.Id != exceptMatchId.Value) &&
            (m.Status == MatchStatus.Scheduled || m.Status == MatchStatus.Ready || m.Status == MatchStatus.InProgress), ct);

    public Task<bool> HasActiveMatchForUserAsync(Guid userId, CancellationToken ct = default)
        => Set.AnyAsync(m =>
            (m.Status == MatchStatus.Scheduled || m.Status == MatchStatus.Ready || m.Status == MatchStatus.InProgress) &&
            m.Players.Any(p => p.UserId == userId), ct);

    public Task<bool> InviteCodeExistsAsync(string inviteCode, CancellationToken ct = default)
        => Set.AnyAsync(m => m.InviteCode == inviteCode, ct);

    private static int NormalizePage(int page) => Math.Max(1, page);

    private static int NormalizePageSize(int pageSize, int defaultValue)
        => Math.Clamp(pageSize <= 0 ? defaultValue : pageSize, 1, 100);
}
