using VSMatch.Dtos.Matches;

namespace VSMatch.Services.Matches;

public interface IMatchService
{
    Task<IReadOnlyList<MatchDto>> GetAllAsync(Guid? courtId = null, CancellationToken ct = default);
    Task<MatchDto?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<MatchDto?> GetByInviteCodeAsync(string inviteCode, CancellationToken ct = default);
    Task<MatchDto> CreateAsync(CreateMatchRequest req, Guid userId, CancellationToken ct = default);
    Task<MatchDto?> UpdateAsync(Guid id, UpdateMatchRequest req, CancellationToken ct = default);
    Task<bool> DeleteAsync(Guid id, CancellationToken ct = default);
    Task<MatchDto?> JoinAsync(Guid id, Guid userId, CancellationToken ct = default);
    Task<MatchDto?> LeaveAsync(Guid id, Guid userId, CancellationToken ct = default);
}
