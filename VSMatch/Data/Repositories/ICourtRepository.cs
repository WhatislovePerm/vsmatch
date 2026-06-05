using VSMatch.Data.Entities;
using VSMatch.Domain.Sports;

namespace VSMatch.Data.Repositories;

public interface ICourtRepository : IBaseRepository<Court>
{
    Task<bool> AnyAsync(CancellationToken ct = default);
    Task<HashSet<long>> GetExistingOsmIdsAsync(CancellationToken ct = default);
    Task<IReadOnlyList<Court>> ListBySportAsync(SportKind sport, CancellationToken ct = default);
}
