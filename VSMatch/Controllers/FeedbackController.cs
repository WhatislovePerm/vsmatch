using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VSMatch.Domain;
using VSMatch.Dtos.Feedback;
using VSMatch.Services.Auth;
using VSMatch.Services.Feedback;

namespace VSMatch.Controllers;

[ApiController]
[Authorize]
[Route("api/feedback")]
public class FeedbackController : ControllerBase
{
    private readonly IFeedbackService _feedback;
    private readonly ICurrentUser _currentUser;

    public FeedbackController(IFeedbackService feedback, ICurrentUser currentUser)
    {
        _feedback = feedback;
        _currentUser = currentUser;
    }

    /// <summary>Любой авторизованный пользователь может оставить обращение.</summary>
    [HttpPost]
    public async Task<ActionResult<FeedbackDto>> Create(
        [FromBody] CreateFeedbackRequest req,
        CancellationToken ct)
    {
        try
        {
            var dto = await _feedback.CreateAsync(_currentUser.Id, req, ct);
            return Created($"/api/feedback/{dto.Id}", dto);
        }
        catch (AppException ex)
        {
            return ApiErrors.ToActionResult(ex);
        }
    }
}
