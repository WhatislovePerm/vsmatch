using VSMatch.Dtos.Matches;
using VSMatch.Data.Entities;
using VSMatch.Domain.Sports;

namespace VSMatch.Services.Matches;

public interface IMatchService
{
    Task<IReadOnlyList<MatchDto>> GetAllAsync(SportKind? sport = null, Guid? courtId = null, int page = 1, int pageSize = 100, CancellationToken ct = default);
    Task<IReadOnlyList<MatchDto>> GetHistoryByUserAsync(Guid userId, SportKind? sport = null, int page = 1, int pageSize = 50, CancellationToken ct = default);
    Task<MatchDto?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<MatchDto?> GetByInviteCodeAsync(string inviteCode, CancellationToken ct = default);
    Task<MatchDto> CreateAsync(CreateMatchRequest req, Guid userId, CancellationToken ct = default);
    Task<MatchDto?> UpdateAsync(Guid id, UpdateMatchRequest req, Guid userId, CancellationToken ct = default);
    Task<bool> DeleteAsync(Guid id, Guid userId, CancellationToken ct = default);
    Task<MatchDto?> JoinAsync(Guid id, Guid userId, MatchTeam team, CancellationToken ct = default);
    Task<MatchDto?> LeaveAsync(Guid id, Guid userId, CancellationToken ct = default);
    Task<MatchDto?> ShuffleTeamsAsync(Guid id, Guid userId, CancellationToken ct = default);
    Task<MatchDto?> SubmitResultAsync(Guid id, SubmitMatchResultRequest req, Guid userId, CancellationToken ct = default);
}
