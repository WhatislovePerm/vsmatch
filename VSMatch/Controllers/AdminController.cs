using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VSMatch.Domain;
using VSMatch.Dtos.Admin;
using VSMatch.Dtos.Feedback;
using VSMatch.Services.Admin;
using VSMatch.Services.Auth;
using VSMatch.Services.Feedback;

namespace VSMatch.Controllers;

/// <summary>Все админские ручки. Доступ — через policy (live-проверка IsAdmin в БД).</summary>
[ApiController]
[Authorize(Policy = AdminPolicy.Name)]
[Route("api/admin")]
public class AdminController : ControllerBase
{
    private readonly IAdminService _admin;
    private readonly IFeedbackService _feedback;

    public AdminController(IAdminService admin, IFeedbackService feedback)
    {
        _admin = admin;
        _feedback = feedback;
    }

    [HttpGet("stats")]
    public async Task<ActionResult<AdminStatsDto>> Stats(CancellationToken ct)
        => Ok(await _admin.GetStatsAsync(ct));

    [HttpGet("feedback")]
    public async Task<ActionResult<IReadOnlyList<FeedbackDto>>> ListFeedback(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        CancellationToken ct = default)
        => Ok(await _feedback.ListAllAsync(page, pageSize, ct));

    [HttpPatch("feedback/{id:guid}")]
    public async Task<ActionResult<FeedbackDto>> UpdateFeedback(
        Guid id,
        [FromBody] UpdateFeedbackRequest req,
        CancellationToken ct)
    {
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
}
