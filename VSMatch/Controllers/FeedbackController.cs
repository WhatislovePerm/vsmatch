using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using VSMatch.Data;
using VSMatch.Domain;
using VSMatch.Data.Entities;
using VSMatch.Dtos.Admin;
using VSMatch.Dtos.Feedback;
using VSMatch.Services.Auth;
using VSMatch.Services.Feedback;

namespace VSMatch.Controllers;

[ApiController]
[Authorize]
[Route("api")]
public class FeedbackController : ControllerBase
{
    private readonly IFeedbackService _feedback;
    private readonly ICurrentUser _currentUser;
    private readonly AppDbContext _db;

    public FeedbackController(IFeedbackService feedback, ICurrentUser currentUser, AppDbContext db)
    {
        _feedback = feedback;
        _currentUser = currentUser;
        _db = db;
    }

    /// <summary>
    /// Любой авторизованный пользователь может оставить обращение.
    /// </summary>
    [HttpPost("feedback")]
    public async Task<ActionResult<FeedbackDto>> Create(
        [FromBody] CreateFeedbackRequest req,
        CancellationToken ct)
    {
        try
        {
            var dto = await _feedback.CreateAsync(_currentUser.Id, req, ct);
            return CreatedAtAction(nameof(ListAll), null, dto);
        }
        catch (AppException ex)
        {
            return ApiErrors.ToActionResult(ex);
        }
    }

    /// <summary>
    /// Список всех обращений — только админу.
    /// </summary>
    [HttpGet("admin/feedback")]
    public async Task<ActionResult<IReadOnlyList<FeedbackDto>>> ListAll(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        CancellationToken ct = default)
    {
        if (!await IsAdminAsync(ct)) return Forbid();
        return Ok(await _feedback.ListAllAsync(page, pageSize, ct));
    }

    /// <summary>
    /// Изменить статус/ответ — только админу.
    /// </summary>
    [HttpPatch("admin/feedback/{id:guid}")]
    public async Task<ActionResult<FeedbackDto>> Update(
        Guid id,
        [FromBody] UpdateFeedbackRequest req,
        CancellationToken ct)
    {
        if (!await IsAdminAsync(ct)) return Forbid();
        try
        {
            var updated = await _feedback.UpdateAsync(id, req, ct);
            return updated is null ? NotFound() : Ok(updated);
        }
        catch (AppException ex)
        {
            return ApiErrors.ToActionResult(ex);
        }
    }

    /// <summary>
    /// Общая статистика продукта — только админу.
    /// </summary>
    [HttpGet("admin/stats")]
    public async Task<ActionResult<AdminStatsDto>> Stats(CancellationToken ct)
    {
        if (!await IsAdminAsync(ct)) return Forbid();

        var activeStatuses = new[] { MatchStatus.Scheduled, MatchStatus.Ready, MatchStatus.InProgress };

        var topPlayers = await _db.UserRatings
            .AsNoTracking()
            .Include(r => r.User)
            .OrderByDescending(r => r.Rating)
            .Take(5)
            .Select(r => new AdminTopPlayerDto(
                r.UserId,
                r.User != null ? r.User.DisplayName : r.UserId.ToString(),
                r.Sport,
                r.Rating))
            .ToListAsync(ct);

        return Ok(new AdminStatsDto(
            Users: await _db.Users.CountAsync(ct),
            Courts: await _db.Courts.CountAsync(ct),
            Matches: await _db.Matches.CountAsync(ct),
            ActiveMatches: await _db.Matches.CountAsync(m => activeStatuses.Contains(m.Status), ct),
            CompletedMatches: await _db.Matches.CountAsync(m => m.Status == MatchStatus.Completed, ct),
            CancelledMatches: await _db.Matches.CountAsync(m => m.Status == MatchStatus.Cancelled, ct),
            NewFeedback: await _db.Feedbacks.CountAsync(f => f.Status == FeedbackStatus.New, ct),
            TopPlayers: topPlayers
        ));
    }

    private async Task<bool> IsAdminAsync(CancellationToken ct)
        => await _db.Users.AsNoTracking()
            .Where(u => u.Id == _currentUser.Id)
            .Select(u => u.IsAdmin)
            .FirstOrDefaultAsync(ct);
}
