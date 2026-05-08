using Microsoft.EntityFrameworkCore;
using VSMatch.Data;
using VSMatch.Data.Entities;
using VSMatch.Data.Repositories;
using VSMatch.Domain;
using VSMatch.Domain.Matches;
using VSMatch.Dtos.Matches;
using VSMatch.Mapping;

namespace VSMatch.Services.Matches;

public class MatchService : IMatchService
{
    private readonly AppDbContext _db;
    private readonly IMatchRepository _matches;
    private readonly ICourtRepository _courts;
    private readonly IMatchEventHub _events;

    public MatchService(AppDbContext db, IMatchRepository matches, ICourtRepository courts, IMatchEventHub events)
    {
        _db = db;
        _matches = matches;
        _courts = courts;
        _events = events;
    }

    public async Task<IReadOnlyList<MatchDto>> GetAllAsync(Guid? courtId = null, int page = 1, int pageSize = 100, CancellationToken ct = default)
    {
        var matches = courtId.HasValue
            ? await _matches.ListByCourtAsync(courtId.Value, page, pageSize, ct)
            : await _matches.ListPagedAsync(page, pageSize, ct);

        return matches.Select(MatchMapper.ToDto).ToList();
    }

    public async Task<IReadOnlyList<MatchDto>> GetHistoryByUserAsync(Guid userId, int page = 1, int pageSize = 50, CancellationToken ct = default)
    {
        var matches = await _matches.ListHistoryByUserAsync(userId, page, pageSize, ct);
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
        return match is null ? null : MatchMapper.ToDto(match);
    }

    public async Task<MatchDto> CreateAsync(CreateMatchRequest req, Guid userId, CancellationToken ct = default)
    {
        MatchValidationRules.Validate(req);

        await using var tx = await _db.Database.BeginTransactionAsync(ct);

        var court = await _courts.GetByIdAsync(req.CourtId, ct)
            ?? throw new NotFoundException("Court not found.");

        if (await _matches.HasActiveMatchForCourtAsync(req.CourtId, exceptMatchId: null, ct))
            throw new ConflictException("Court already has an active match.");

        var match = new Match
        {
            Id = Guid.NewGuid(),
            CourtId = req.CourtId,
            CreatedByUserId = userId,
            InviteCode = await GenerateInviteCodeAsync(ct),
            Title = req.Title.Trim(),
            Description = string.IsNullOrWhiteSpace(req.Description) ? null : req.Description.Trim(),
            TeamAName = MatchValidationRules.NormalizeTeamName(req.TeamAName, "Команда A"),
            TeamBName = MatchValidationRules.NormalizeTeamName(req.TeamBName, "Команда B"),
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
        MatchValidationRules.Validate(req);

        await using var tx = await _db.Database.BeginTransactionAsync(ct);

        var match = await _matches.GetByIdAsync(id, ct);
        if (match is null) return null;
        EnsureCreator(match, userId);
        if (req.MaxPlayers < match.Players.Count)
            throw new ValidationException("Max players cannot be less than current players count.");

        var oldCourtId = match.CourtId;
        var newCourt = await _courts.GetByIdAsync(req.CourtId, ct)
            ?? throw new NotFoundException("Court not found.");

        match.CourtId = req.CourtId;
        match.Title = req.Title.Trim();
        match.Description = string.IsNullOrWhiteSpace(req.Description) ? null : req.Description.Trim();
        match.TeamAName = MatchValidationRules.NormalizeTeamName(req.TeamAName, "Команда A");
        match.TeamBName = MatchValidationRules.NormalizeTeamName(req.TeamBName, "Команда B");
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
            throw new InvalidMatchStateException("Cannot join a completed or cancelled match.");
        if (match.Players.Any(p => p.UserId == userId))
            return MatchMapper.ToDto(match);
        if (match.Players.Count >= match.MaxPlayers)
            throw new ConflictException("Match is full.");

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
            throw new InvalidMatchStateException("Final match teams cannot be changed.");

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
            throw new InvalidMatchStateException("Only an active match can be completed with result.");
        if (req.TeamAScore < 0 || req.TeamBScore < 0)
            throw new ValidationException("Score cannot be negative.");

        if (req.Players.Select(p => p.UserId).Distinct().Count() != req.Players.Count)
            throw new ValidationException("Duplicate player stats are not allowed.");

        var statsByUserId = req.Players.ToDictionary(p => p.UserId);
        if (statsByUserId.Count != match.Players.Count || match.Players.Any(p => !statsByUserId.ContainsKey(p.UserId)))
            throw new ValidationException("Stats must be provided for every match player.");
        if (req.Players.Any(p => p.Goals < 0 || p.Assists < 0))
            throw new ValidationException("Goals and assists cannot be negative.");

        foreach (var player in match.Players)
        {
            if (player.User is null)
                throw new InvalidOperationException("Match player user is missing.");

            var stats = statsByUserId[player.UserId];
            var delta = RatingCalculator.CalculateDelta(player.Team, req.TeamAScore, req.TeamBScore, stats.Goals, stats.Assists);

            player.Goals = stats.Goals;
            player.Assists = stats.Assists;
            player.RatingDelta = delta;
            player.User.Rating = Math.Max(0, player.User.Rating + delta);
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
        var match = await _matches.GetByIdAsync(id, ct);
        if (match is null) return null;

        var player = match.Players.FirstOrDefault(p => p.UserId == userId);
        if (player is null) return MatchMapper.ToDto(match);

        match.Players.Remove(player);
        if (match.Status == MatchStatus.Ready && match.Players.Count < 2)
            match.Status = MatchStatus.Scheduled;
        match.UpdatedAt = DateTime.UtcNow;

        _matches.Update(match);
        await _matches.SaveChangesAsync(ct);
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
            throw new ForbiddenException("Only match creator can do this.");
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

        throw new InvalidOperationException("Could not generate unique invite code.");
    }
}
