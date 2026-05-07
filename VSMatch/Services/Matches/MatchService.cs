using VSMatch.Data.Entities;
using VSMatch.Data.Repositories;
using VSMatch.Dtos.Matches;

namespace VSMatch.Services.Matches;

public class MatchService : IMatchService
{
    private readonly IMatchRepository _matches;
    private readonly ICourtRepository _courts;
    private readonly IMatchEventHub _events;

    public MatchService(IMatchRepository matches, ICourtRepository courts, IMatchEventHub events)
    {
        _matches = matches;
        _courts = courts;
        _events = events;
    }

    public async Task<IReadOnlyList<MatchDto>> GetAllAsync(Guid? courtId = null, CancellationToken ct = default)
    {
        var matches = courtId.HasValue
            ? await _matches.ListByCourtAsync(courtId.Value, ct)
            : await _matches.ListAsync(ct);

        return matches.Select(ToDto).ToList();
    }

    public async Task<MatchDto?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var match = await _matches.GetByIdAsync(id, ct);
        return match is null ? null : ToDto(match);
    }

    public async Task<MatchDto?> GetByInviteCodeAsync(string inviteCode, CancellationToken ct = default)
    {
        var match = await _matches.GetByInviteCodeAsync(inviteCode, ct);
        return match is null ? null : ToDto(match);
    }

    public async Task<MatchDto> CreateAsync(CreateMatchRequest req, Guid userId, CancellationToken ct = default)
    {
        Validate(req.Title, req.DurationMinutes, req.MaxPlayers);

        var court = await _courts.GetByIdAsync(req.CourtId, ct)
            ?? throw new InvalidOperationException("Court not found.");

        var match = new Match
        {
            Id = Guid.NewGuid(),
            CourtId = req.CourtId,
            CreatedByUserId = userId,
            InviteCode = await GenerateInviteCodeAsync(ct),
            Title = req.Title.Trim(),
            Description = string.IsNullOrWhiteSpace(req.Description) ? null : req.Description.Trim(),
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
            JoinedAt = DateTime.UtcNow,
        });

        court.IsFree = false;
        _courts.Update(court);
        await _matches.AddAsync(match, ct);
        await _matches.SaveChangesAsync(ct);
        await _events.PublishChangedAsync(ct);

        match.Court = court;
        return ToDto(match);
    }

    public async Task<MatchDto?> UpdateAsync(Guid id, UpdateMatchRequest req, CancellationToken ct = default)
    {
        Validate(req.Title, req.DurationMinutes, req.MaxPlayers);

        var match = await _matches.GetByIdAsync(id, ct);
        if (match is null) return null;
        if (req.MaxPlayers < match.Players.Count)
            throw new InvalidOperationException("Max players cannot be less than current players count.");

        var oldCourtId = match.CourtId;
        var newCourt = await _courts.GetByIdAsync(req.CourtId, ct)
            ?? throw new InvalidOperationException("Court not found.");

        match.CourtId = req.CourtId;
        match.Title = req.Title.Trim();
        match.Description = string.IsNullOrWhiteSpace(req.Description) ? null : req.Description.Trim();
        match.StartsAtUtc = DateTime.SpecifyKind(req.StartsAtUtc, DateTimeKind.Utc);
        match.DurationMinutes = req.DurationMinutes;
        match.MaxPlayers = req.MaxPlayers;
        match.Status = ValidateStatusTransition(match.Status, req.Status);
        match.UpdatedAt = DateTime.UtcNow;

        _matches.Update(match);
        await _matches.SaveChangesAsync(ct);

        await RecalculateCourtAvailabilityAsync(oldCourtId, exceptMatchId: match.Id, ct);
        await RecalculateCourtAvailabilityAsync(req.CourtId, exceptMatchId: null, ct);
        await _matches.SaveChangesAsync(ct);
        await _events.PublishChangedAsync(ct);

        match.Court = newCourt;
        return ToDto(match);
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var match = await _matches.GetByIdAsync(id, ct);
        if (match is null) return false;

        var courtId = match.CourtId;
        _matches.Remove(match);
        await _matches.SaveChangesAsync(ct);

        await RecalculateCourtAvailabilityAsync(courtId, exceptMatchId: null, ct);
        await _matches.SaveChangesAsync(ct);
        await _events.PublishChangedAsync(ct);
        return true;
    }

    public async Task<MatchDto?> JoinAsync(Guid id, Guid userId, CancellationToken ct = default)
    {
        var match = await _matches.GetByIdAsync(id, ct);
        if (match is null) return null;
        if (match.Status is MatchStatus.Completed or MatchStatus.Cancelled)
            throw new InvalidOperationException("Cannot join a completed or cancelled match.");
        if (match.Players.Any(p => p.UserId == userId))
            return ToDto(match);
        if (match.Players.Count >= match.MaxPlayers)
            throw new InvalidOperationException("Match is full.");

        match.Players.Add(new MatchPlayer
        {
            MatchId = match.Id,
            UserId = userId,
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

    public async Task<MatchDto?> LeaveAsync(Guid id, Guid userId, CancellationToken ct = default)
    {
        var match = await _matches.GetByIdAsync(id, ct);
        if (match is null) return null;

        var player = match.Players.FirstOrDefault(p => p.UserId == userId);
        if (player is null) return ToDto(match);

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

    private static void Validate(string title, int durationMinutes, int maxPlayers)
    {
        if (string.IsNullOrWhiteSpace(title))
            throw new InvalidOperationException("Title is required.");
        if (durationMinutes < 15 || durationMinutes > 240)
            throw new InvalidOperationException("Duration must be between 15 and 240 minutes.");
        if (maxPlayers < 2 || maxPlayers > 50)
            throw new InvalidOperationException("Max players must be between 2 and 50.");
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

    private static MatchStatus ValidateStatusTransition(MatchStatus current, MatchStatus next)
    {
        if (current == next) return next;
        if (current == MatchStatus.Cancelled || current == MatchStatus.Completed)
            throw new InvalidOperationException("Final match status cannot be changed.");

        var allowed = current switch
        {
            MatchStatus.Scheduled => next is MatchStatus.Ready or MatchStatus.Cancelled,
            MatchStatus.Ready => next is MatchStatus.InProgress or MatchStatus.Cancelled,
            MatchStatus.InProgress => next is MatchStatus.Completed or MatchStatus.Cancelled,
            _ => false,
        };

        if (!allowed)
            throw new InvalidOperationException($"Invalid status transition: {current} -> {next}.");

        return next;
    }

    private static MatchDto ToDto(Match m) =>
        new(
            m.Id,
            m.CourtId,
            m.Court?.Name ?? string.Empty,
            m.CreatedByUserId,
            m.InviteCode,
            $"/matches/join/{m.InviteCode}",
            m.Title,
            m.Description,
            m.StartsAtUtc,
            m.DurationMinutes,
            m.MaxPlayers,
            m.Players.Count,
            m.Players
                .OrderBy(p => p.JoinedAt)
                .Select(p => new MatchPlayerDto(
                    p.UserId,
                    p.User?.DisplayName ?? p.UserId.ToString(),
                    p.JoinedAt))
                .ToList(),
            m.Status,
            m.CreatedAt,
            m.UpdatedAt);
}
