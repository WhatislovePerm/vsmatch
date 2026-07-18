using VSMatch.Dtos.Admin;

namespace VSMatch.Services.Admin;

public interface IAdminService
{
    Task<AdminStatsDto> GetStatsAsync(CancellationToken ct = default);
}
