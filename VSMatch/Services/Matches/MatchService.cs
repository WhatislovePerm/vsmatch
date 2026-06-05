using Microsoft.EntityFrameworkCore;
using VSMatch.Data;
using VSMatch.Data.Entities;
using VSMatch.Data.Repositories;
using VSMatch.Domain;
using VSMatch.Domain.Matches;
using VSMatch.Domain.Moderation;
using VSMatch.Domain.Sports;
using VSMatch.Dtos.Matches;
using VSMatch.Mapping;

namespace VSMatch.Services.Matches;

public class MatchService : IMatchService
{
    private readonly AppDbContext _db;
    private readonly IMatchRepository _matches;
    private readonly ICourtRepository _courts;
    private readonly IMatchEventHub _events;
    private readonly IContentModerator _moderator;

    public MatchService(AppDbContext db, IMatchRepository matches, ICourtRepository courts, IMatchEventHub events, IContentModerator moderator)
    {
        _db = db;
        _matches = matches;
        _courts = courts;
        _events = events;
        _moderator = moderator;
    }

    public async Task<IReadOnlyList<MatchDto>> GetAllAsync(SportKind? sport = null, Guid? courtId = null, int page = 1, int pageSize = 100, CancellationToken ct = default)
    {
        IReadOnlyList<Match> matches;
        if (courtId.HasValue)
        {
            matches = await _matches.ListByCourtAsync(courtId.Value, page, pageSize, ct);
            if (sport.HasValue) matches = matches.Where(m => m.Sport == sport.Value).ToList();
        }
        else
        {
            matches = await _matches.ListPagedAsync(sport, page, pageSize, ct);
        }

        return matches.Select(MatchMapper.ToDto).ToList();
    }

    public async Task<IReadOnlyList<MatchDto>> GetHistoryByUserAsync(Guid userId, SportKind? sport = null, int page = 1, int pageSize = 50, CancellationToken ct = default)
    {
        var matches = await _matches.ListHistoryByUserAsync(userId, sport, page, pageSize, ct);
        return matches.Select(MatchMapper.ToDto).ToList();
    }

    public async Task<MatchDto?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var match = await _matches.GetByIdAsync(id, ct);
        return match is null ? null : MatchMapper.ToDto(match);
    }

    public async Task<MatchDto?> GetByInviteCodeAsync(string inviteCode, CancellationToken ct = default)
    {
        var match = await _matches.GetByInviteCodeAsync(inviteCode, ct);
        if (match is null) return null;
        if (match.Status is not (MatchStatus.Scheduled or MatchStatus.Ready)) return null;
        return MatchMapper.ToDto(match);
    }

    public async Task<MatchDto> CreateAsync(CreateMatchRequest req, Guid userId, CancellationToken ct = default)
    {
        MatchValidationRules.Validate(req, _moderator);

        await using var tx = await _db.Database.BeginTransactionAsync(ct);

        var court = await _courts.GetByIdAsync(req.CourtId, ct)
            ?? throw new NotFoundException("Площадка не найдена.");

        if (await _matches.HasActiveMatchForCourtAsync(req.CourtId, exceptMatchId: null, ct))
            throw new ConflictException("На этой площадке уже идёт матч.");

        if (await _matches.HasActiveMatchForUserAsync(userId, ct))
            throw new ConflictException("У вас уже есть активный матч. Завершите или отмените его.");

        var match = new Match
        {
            Id = Guid.NewGuid(),
            CourtId = req.CourtId,
            CreatedByUserId = userId,
            Sport = court.SportKind,
            InviteCode = await GenerateInviteCodeAsync(ct),
            Title = req.Title.Trim(),
            Description = string.IsNullOrWhiteSpace(req.Description) ? null : req.Description.Trim(),
            TeamAName = MatchValidationRules.NormalizeTeamName(req.TeamAName, "Команда A", _moderator, "Команда 1"),
            TeamBName = MatchValidationRules.NormalizeTeamName(req.TeamBName, "Команда B", _moderator, "Команда 2"),
            StartsAtUtc = DateTime.SpecifyKind(req.StartsAtUtc, DateTimeKind.Utc),
            DurationMinutes = req.DurationMinutes,
            MaxPlayers = req.MaxPlayers,
            Status = MatchStatus.Scheduled,
            CreatedAt = DateTime.UtcNow,
        };
        match.Players.Add(new MatchPlayer
        {
            MatchId = match.Id,
            UserId = userId,
            Team = MatchTeam.TeamA,
            JoinedAt = DateTime.UtcNow,
        });

        court.IsFree = false;
        _courts.Update(court);
        await _matches.AddAsync(match, ct);
        await _matches.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        await _events.PublishChangedAsync(ct);

        match.Court = court;
        return MatchMapper.ToDto(match);
    }

    public async Task<MatchDto?> UpdateAsync(Guid id, UpdateMatchRequest req, Guid userId, CancellationToken ct = default)
    {
        MatchValidationRules.Validate(req, _moderator);

        await using var tx = await _db.Database.BeginTransactionAsync(ct);

        var match = await _matches.GetByIdAsync(id, ct);
        if (match is null) return null;
        EnsureCreator(match, userId);
        if (req.MaxPlayers < match.Players.Count)
            throw new ValidationException("Нельзя поставить меньше игроков, чем уже в матче.");

        var oldCourtId = match.CourtId;
        var newCourt = await _courts.GetByIdAsync(req.CourtId, ct)
            ?? throw new NotFoundException("Площадка не найдена.");

        match.CourtId = req.CourtId;
        match.Title = req.Title.Trim();
        match.Description = string.IsNullOrWhiteSpace(req.Description) ? null : req.Description.Trim();
        match.TeamAName = MatchValidationRules.NormalizeTeamName(req.TeamAName, "Команда A", _moderator, "Команда 1");
        match.TeamBName = MatchValidationRules.NormalizeTeamName(req.TeamBName, "Команда B", _moderator, "Команда 2");
        match.StartsAtUtc = DateTime.SpecifyKind(req.StartsAtUtc, DateTimeKind.Utc);
        match.DurationMinutes = req.DurationMinutes;
        match.MaxPlayers = req.MaxPlayers;
        match.Status = MatchLifecycle.ValidateTransition(match.Status, req.Status);
        match.UpdatedAt = DateTime.UtcNow;

        _matches.Update(match);
        await _matches.SaveChangesAsync(ct);

        await RecalculateCourtAvailabilityAsync(oldCourtId, exceptMatchId: match.Id, ct);
        await RecalculateCourtAvailabilityAsync(req.CourtId, exceptMatchId: null, ct);
        await _matches.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        await _events.PublishChangedAsync(ct);

        match.Court = newCourt;
        return MatchMapper.ToDto(match);
    }

    public async Task<bool> DeleteAsync(Guid id, Guid userId, CancellationToken ct = default)
    {
        await using var tx = await _db.Database.BeginTransactionAsync(ct);

        var match = await _matches.GetByIdAsync(id, ct);
        if (match is null) return false;
        EnsureCreator(match, userId);

        var courtId = match.CourtId;
        _matches.Remove(match);
        await _matches.SaveChangesAsync(ct);

        await RecalculateCourtAvailabilityAsync(courtId, exceptMatchId: null, ct);
        await _matches.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        await _events.PublishChangedAsync(ct);
        return true;
    }

    public async Task<MatchDto?> JoinAsync(Guid id, Guid userId, MatchTeam team, CancellationToken ct = default)
    {
        var match = await _matches.GetByIdAsync(id, ct);
        if (match is null) return null;
        if (!MatchLifecycle.IsActive(match.Status))
            throw new InvalidMatchStateException("Нельзя войти в завершённый или отменённый матч.");
        if (match.Players.Any(p => p.UserId == userId))
            return MatchMapper.ToDto(match);
        if (await _matches.HasActiveMatchForUserAsync(userId, ct))
            throw new ConflictException("У вас уже есть активный матч. Завершите, отмените или покиньте его.");
        if (match.Players.Count >= match.MaxPlayers)
            throw new ConflictException("В матче нет свободных мест.");

        match.Players.Add(new MatchPlayer
        {
            MatchId = match.Id,
            UserId = userId,
            Team = team,
            JoinedAt = DateTime.UtcNow,
        });
        if (match.Status == MatchStatus.Scheduled && match.Players.Count >= 2)
            match.Status = MatchStatus.Ready;
        match.UpdatedAt = DateTime.UtcNow;

        _matches.Update(match);
        await _matches.SaveChangesAsync(ct);
        await _events.PublishChangedAsync(ct);

        return await GetByIdAsync(id, ct);
    }

    public async Task<MatchDto?> ShuffleTeamsAsync(Guid id, Guid userId, CancellationToken ct = default)
    {
        var match = await _matches.GetByIdAsync(id, ct);
        if (match is null) return null;
        EnsureCreator(match, userId);
        if (!MatchLifecycle.IsActive(match.Status))
            throw new InvalidMatchStateException("Команды в финальном матче менять нельзя.");

        var players = match.Players
            .OrderBy(_ => Random.Shared.Next())
            .ToList();

        for (var i = 0; i < players.Count; i++)
            players[i].Team = i % 2 == 0 ? MatchTeam.TeamA : MatchTeam.TeamB;

        match.UpdatedAt = DateTime.UtcNow;
        _matches.Update(match);
        await _matches.SaveChangesAsync(ct);
        await _events.PublishChangedAsync(ct);

        return await GetByIdAsync(id, ct);
    }

    public async Task<MatchDto?> SubmitResultAsync(Guid id, SubmitMatchResultRequest req, Guid userId, CancellationToken ct = default)
    {
        await using var tx = await _db.Database.BeginTransactionAsync(ct);

        var match = await _matches.GetByIdAsync(id, ct);
        if (match is null) return null;
        EnsureCreator(match, userId);
        if (match.Status != MatchStatus.InProgress)
            throw new InvalidMatchStateException("Записать счёт можно только в идущем матче.");
        if (req.TeamAScore < 0 || req.TeamBScore < 0)
            throw new ValidationException("Счёт не может быть отрицательным.");

        if (req.Players.Select(p => p.UserId).Distinct().Count() != req.Players.Count)
            throw new ValidationException("Дублирование статистики игроков недопустимо.");

        var statsByUserId = req.Players.ToDictionary(p => p.UserId);
        if (statsByUserId.Count != match.Players.Count || match.Players.Any(p => !statsByUserId.ContainsKey(p.UserId)))
            throw new ValidationException("Заполните статистику для каждого игрока.");
        if (req.Players.Any(p => p.Goals < 0 || p.Assists < 0))
            throw new ValidationException("Голы и пасы не могут быть отрицательными.");

        foreach (var player in match.Players)
        {
            if (player.User is null)
                throw new InvalidOperationException("Игрок матча не найден.");

            var stats = statsByUserId[player.UserId];
            var delta = RatingCalculator.CalculateDelta(player.Team, req.TeamAScore, req.TeamBScore, stats.Goals, stats.Assists);

            player.Goals = stats.Goals;
            player.Assists = stats.Assists;
            player.RatingDelta = delta;

            // Рейтинг по конкретному спорту: создаём UserRating если ещё нет.
            var sportRating = player.User.Ratings.FirstOrDefault(r => r.Sport == match.Sport);
            if (sportRating is null)
            {
                sportRating = new UserRating
                {
                    UserId = player.UserId,
                    Sport = match.Sport,
                    Rating = 1000,
                };
                player.User.Ratings.Add(sportRating);
                _db.UserRatings.Add(sportRating);
            }
            sportRating.Rating = Math.Max(0, sportRating.Rating + delta);
        }

        match.TeamAScore = req.TeamAScore;
        match.TeamBScore = req.TeamBScore;
        match.ResultSubmittedAt = DateTime.UtcNow;
        match.Status = MatchStatus.Completed;
        match.UpdatedAt = DateTime.UtcNow;

        _matches.Update(match);
        await _matches.SaveChangesAsync(ct);
        await RecalculateCourtAvailabilityAsync(match.CourtId, exceptMatchId: null, ct);
        await _matches.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        await _events.PublishChangedAsync(ct);

        return await GetByIdAsync(id, ct);
    }

    public async Task<MatchDto?> LeaveAsync(Guid id, Guid userId, CancellationToken ct = default)
    {
        await using var tx = await _db.Database.BeginTransactionAsync(ct);

        var match = await _matches.GetByIdAsync(id, ct);
        if (match is null) return null;
        if (match.Status == MatchStatus.InProgress)
            throw new InvalidMatchStateException("Нельзя выйти из начавшегося матча.");
        if (match.Status is MatchStatus.Completed or MatchStatus.Cancelled)
            throw new InvalidMatchStateException("Нельзя выйти из завершённого матча.");

        var player = match.Players.FirstOrDefault(p => p.UserId == userId);
        if (player is null) return MatchMapper.ToDto(match);

        match.Players.Remove(player);
        if (match.CreatedByUserId == userId || match.Players.Count == 0)
        {
            match.Status = MatchStatus.Cancelled;
        }
        else if (match.Status == MatchStatus.Ready && match.Players.Count < 2)
        {
            match.Status = MatchStatus.Scheduled;
        }
        match.UpdatedAt = DateTime.UtcNow;

        _matches.Update(match);
        await _matches.SaveChangesAsync(ct);
        await RecalculateCourtAvailabilityAsync(match.CourtId, exceptMatchId: null, ct);
        await _matches.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        await _events.PublishChangedAsync(ct);

        return await GetByIdAsync(id, ct);
    }

    private async Task RecalculateCourtAvailabilityAsync(Guid courtId, Guid? exceptMatchId, CancellationToken ct)
    {
        var court = await _courts.GetByIdAsync(courtId, ct);
        if (court is null) return;

        var hasActive = await _matches.HasActiveMatchForCourtAsync(courtId, exceptMatchId, ct);
        court.IsFree = !hasActive;
        _courts.Update(court);
    }

    private static void EnsureCreator(Match match, Guid userId)
    {
        if (match.CreatedByUserId != userId)
            throw new ForbiddenException("Это может сделать только создатель матча.");
    }

    private async Task<string> GenerateInviteCodeAsync(CancellationToken ct)
    {
        for (var i = 0; i < 5; i++)
        {
            var code = Convert.ToBase64String(Guid.NewGuid().ToByteArray())
                .Replace("+", "")
                .Replace("/", "")
                .Replace("=", "")
                [..10];

            if (!await _matches.InviteCodeExistsAsync(code, ct))
                return code;
        }

        throw new InvalidOperationException("Не удалось сгенерировать ссылку-приглашение.");
    }
}
