using VSMatch.Data.Entities;

namespace VSMatch.Data.Repositories;

public interface ICourtRepository : IBaseRepository<Court>
{
    Task<bool> AnyAsync(CancellationToken ct = default);
    Task<HashSet<long>> GetExistingOsmIdsAsync(CancellationToken ct = default);
}
