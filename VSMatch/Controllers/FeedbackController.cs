using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using VSMatch.Data;
using VSMatch.Domain;
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

    private async Task<bool> IsAdminAsync(CancellationToken ct)
        => await _db.Users.AsNoTracking()
            .Where(u => u.Id == _currentUser.Id)
            .Select(u => u.IsAdmin)
            .FirstOrDefaultAsync(ct);
}
