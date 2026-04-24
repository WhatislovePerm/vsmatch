using VSMatch.Dtos.Courts;

namespace VSMatch.Services.Courts;

public interface ICourtService
{
    Task<IReadOnlyList<CourtDto>> GetAllAsync(CancellationToken ct = default);
    Task<CourtDto?> GetByIdAsync(Guid id, CancellationToken ct = default);
}
