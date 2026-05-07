using VSMatch.Data.Entities;

namespace VSMatch.Data.Repositories;

public interface IMatchRepository : IBaseRepository<Match>
{
    Task<IReadOnlyList<Match>> ListByCourtAsync(Guid courtId, CancellationToken ct = default);
    Task<Match?> GetByInviteCodeAsync(string inviteCode, CancellationToken ct = default);
    Task<bool> HasActiveMatchForCourtAsync(Guid courtId, Guid? exceptMatchId = null, CancellationToken ct = default);
    Task<bool> InviteCodeExistsAsync(string inviteCode, CancellationToken ct = default);
}
