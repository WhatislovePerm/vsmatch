using Microsoft.EntityFrameworkCore;
using VSMatch.Data.Entities;
using VSMatch.Domain.Sports;

namespace VSMatch.Data.Repositories;

public class CourtRepository : BaseRepository<Court>, ICourtRepository
{
    public CourtRepository(AppDbContext db) : base(db) { }

    public Task<bool> AnyAsync(CancellationToken ct = default) => Set.AnyAsync(ct);

    public async Task<HashSet<long>> GetExistingOsmIdsAsync(CancellationToken ct = default)
        => (await Set.AsNoTracking().Select(c => c.OsmId).ToListAsync(ct)).ToHashSet();

    public async Task<IReadOnlyList<Court>> ListBySportAsync(SportKind sport, CancellationToken ct = default)
        => await Set.AsNoTracking()
            .Where(c => c.SportKind == sport)
            .OrderBy(c => c.Name)
            .ToListAsync(ct);
}
