using VSMatch.Data.Entities;

namespace VSMatch.Data.Repositories;

public interface IMatchRepository : IBaseRepository<Match>
{
    Task<IReadOnlyList<Match>> ListPagedAsync(int page = 1, int pageSize = 100, CancellationToken ct = default);
    Task<IReadOnlyList<Match>> ListByCourtAsync(Guid courtId, int page = 1, int pageSize = 100, CancellationToken ct = default);
    Task<IReadOnlyList<Match>> ListHistoryByUserAsync(Guid userId, int page = 1, int pageSize = 50, CancellationToken ct = default);
    Task<Match?> GetByInviteCodeAsync(string inviteCode, CancellationToken ct = default);
    Task<bool> HasActiveMatchForCourtAsync(Guid courtId, Guid? exceptMatchId = null, CancellationToken ct = default);
    Task<bool> HasActiveMatchForUserAsync(Guid userId, CancellationToken ct = default);
    Task<bool> InviteCodeExistsAsync(string inviteCode, CancellationToken ct = default);
}
