using Microsoft.EntityFrameworkCore;
using VSMatch.Data;
using VSMatch.Data.Entities;
using VSMatch.Data.Repositories;
using VSMatch.Domain.Sports;
using VSMatch.Dtos.Courts;

namespace VSMatch.Services.Courts;

public class CourtService : ICourtService
{
    private readonly ICourtRepository _repo;
    private readonly AppDbContext _db;

    public CourtService(ICourtRepository repo, AppDbContext db)
    {
        _repo = repo;
        _db = db;
    }

    public async Task<IReadOnlyList<CourtDto>> GetAllAsync(SportKind sport, CancellationToken ct = default)
    {
        var courts = await _repo.ListBySportAsync(sport, ct);
        return courts.Select(ToDto).ToList();
    }

    public async Task<CourtDto?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var court = await _repo.GetByIdAsync(id, ct);
        return court is null ? null : ToDto(court);
    }

    public async Task<IReadOnlyList<TopPlayerDto>> GetTopPlayersAsync(
        Guid courtId, SportKind sport, int top = 3, CancellationToken ct = default)
    {
        // Берём всех уникальных игроков, кто играл хотя бы в одном завершённом
        // матче на этом корте по этому спорту. Сортируем по рейтингу в этом спорте.
        var perPlayer = await _db.MatchPlayers
            .AsNoTracking()
            .Where(p => p.Match!.CourtId == courtId
                     && p.Match.Sport == sport
                     && p.Match.Status == MatchStatus.Completed)
            .GroupBy(p => p.UserId)
            .Select(g => new
            {
                UserId = g.Key,
                MatchCount = g.Count(),
            })
            .ToListAsync(ct);

        if (perPlayer.Count == 0)
            return Array.Empty<TopPlayerDto>();

        var userIds = perPlayer.Select(x => x.UserId).ToList();

        var users = await _db.Users
            .AsNoTracking()
            .Include(u => u.Ratings)
            .Where(u => userIds.Contains(u.Id))
            .Select(u => new
            {
                u.Id,
                u.DisplayName,
                Rating = u.Ratings.Where(r => r.Sport == sport).Select(r => r.Rating).FirstOrDefault(),
            })
            .ToListAsync(ct);

        var initial = Domain.Matches.RatingCalculator.InitialRating;
        var ratingByUser = users.ToDictionary(u => u.Id, u => (u.DisplayName, u.Rating == 0 ? initial : u.Rating));

        return perPlayer
            .Select(x =>
            {
                var (name, rating) = ratingByUser.TryGetValue(x.UserId, out var v) ? v : (x.UserId.ToString(), initial);
                return new TopPlayerDto(x.UserId, name, rating, x.MatchCount);
            })
            .OrderByDescending(x => x.Rating)
            .ThenByDescending(x => x.MatchCount)
            .Take(top)
            .ToList();
    }

    private static CourtDto ToDto(Court c) =>
        new(c.Id, GetDisplayName(c), c.Address, GetDisplayDescription(c), c.Lat, c.Lon, c.SportKind, c.Surface, c.Rating, c.IsFree);

    private static string GetDisplayName(Court c)
        => c.Name.StartsWith("Коробка #", StringComparison.Ordinal)
            ? $"Площадка #{c.OsmId}"
            : c.Name;

    private static string? GetDisplayDescription(Court c)
        => c.Description?.StartsWith("покрытие:", StringComparison.OrdinalIgnoreCase) == true
            ? null
            : c.Description;
}
