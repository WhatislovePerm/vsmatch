using VSMatch.Domain.Sports;
using VSMatch.Dtos.Courts;

namespace VSMatch.Services.Courts;

public interface ICourtService
{
    Task<IReadOnlyList<CourtDto>> GetAllAsync(SportKind sport, CancellationToken ct = default);
    Task<CourtDto?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<IReadOnlyList<TopPlayerDto>> GetTopPlayersAsync(Guid courtId, SportKind sport, int top = 3, CancellationToken ct = default);
}
