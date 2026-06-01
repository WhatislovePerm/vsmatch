using VSMatch.Data.Entities;
using VSMatch.Data.Repositories;
using VSMatch.Dtos.Courts;

namespace VSMatch.Services.Courts;

public class CourtService : ICourtService
{
    private readonly ICourtRepository _repo;

    public CourtService(ICourtRepository repo) => _repo = repo;

    public async Task<IReadOnlyList<CourtDto>> GetAllAsync(CancellationToken ct = default)
    {
        var courts = await _repo.ListAsync(ct);
        return courts.Select(ToDto).ToList();
    }

    public async Task<CourtDto?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var court = await _repo.GetByIdAsync(id, ct);
        return court is null ? null : ToDto(court);
    }

    private static CourtDto ToDto(Court c) =>
        new(c.Id, GetDisplayName(c), c.Address, GetDisplayDescription(c), c.Lat, c.Lon, c.Sport, c.Surface, c.Rating, c.IsFree);

    private static string GetDisplayName(Court c)
        => c.Name.StartsWith("Коробка #", StringComparison.Ordinal)
            ? $"Площадка #{c.OsmId}"
            : c.Name;

    private static string? GetDisplayDescription(Court c)
        => c.Description?.StartsWith("покрытие:", StringComparison.OrdinalIgnoreCase) == true
            ? null
            : c.Description;
}
