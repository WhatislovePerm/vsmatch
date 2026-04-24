using Microsoft.EntityFrameworkCore;
using VSMatch.Data.Entities;

namespace VSMatch.Data.Repositories;

public class CourtRepository : BaseRepository<Court>, ICourtRepository
{
    public CourtRepository(AppDbContext db) : base(db) { }

    public Task<bool> AnyAsync(CancellationToken ct = default) => Set.AnyAsync(ct);

    public async Task<HashSet<long>> GetExistingOsmIdsAsync(CancellationToken ct = default)
        => (await Set.AsNoTracking().Select(c => c.OsmId).ToListAsync(ct)).ToHashSet();
}
