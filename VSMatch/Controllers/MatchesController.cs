using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VSMatch.Dtos.Matches;
using VSMatch.Services.Matches;

namespace VSMatch.Controllers;

[ApiController]
[Authorize]
[Route("api/matches")]
public class MatchesController : ControllerBase
{
    private readonly IMatchService _matches;
    private readonly IMatchEventHub _events;

    public MatchesController(IMatchService matches, IMatchEventHub events)
    {
        _matches = matches;
        _events = events;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<MatchDto>>> GetAll([FromQuery] Guid? courtId, CancellationToken ct)
        => Ok(await _matches.GetAllAsync(courtId, ct));

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<MatchDto>> GetById(Guid id, CancellationToken ct)
    {
        var match = await _matches.GetByIdAsync(id, ct);
        return match is null ? NotFound() : Ok(match);
    }

    [HttpGet("invite/{inviteCode}")]
    public async Task<ActionResult<MatchDto>> GetByInviteCode(string inviteCode, CancellationToken ct)
    {
        var match = await _matches.GetByInviteCodeAsync(inviteCode, ct);
        return match is null ? NotFound() : Ok(match);
    }

    [HttpPost]
    public async Task<ActionResult<MatchDto>> Create(CreateMatchRequest req, CancellationToken ct)
    {
        try
        {
            var userId = GetUserId();
            var created = await _matches.CreateAsync(req, userId, ct);
            return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<MatchDto>> Update(Guid id, UpdateMatchRequest req, CancellationToken ct)
    {
        try
        {
            var updated = await _matches.UpdateAsync(id, req, ct);
            return updated is null ? NotFound() : Ok(updated);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
        => await _matches.DeleteAsync(id, ct) ? NoContent() : NotFound();

    [HttpPost("{id:guid}/players/me")]
    public async Task<ActionResult<MatchDto>> Join(Guid id, CancellationToken ct)
    {
        try
        {
            var match = await _matches.JoinAsync(id, GetUserId(), ct);
            return match is null ? NotFound() : Ok(match);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPost("invite/{inviteCode}/players/me")]
    public async Task<ActionResult<MatchDto>> JoinByInvite(string inviteCode, CancellationToken ct)
    {
        try
        {
            var match = await _matches.GetByInviteCodeAsync(inviteCode, ct);
            if (match is null) return NotFound();

            var joined = await _matches.JoinAsync(match.Id, GetUserId(), ct);
            return joined is null ? NotFound() : Ok(joined);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpDelete("{id:guid}/players/me")]
    public async Task<ActionResult<MatchDto>> Leave(Guid id, CancellationToken ct)
    {
        try
        {
            var match = await _matches.LeaveAsync(id, GetUserId(), ct);
            return match is null ? NotFound() : Ok(match);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [AllowAnonymous]
    [HttpGet("events")]
    public async Task Events(CancellationToken ct)
    {
        Response.Headers.CacheControl = "no-cache";
        Response.Headers.Connection = "keep-alive";
        Response.ContentType = "text/event-stream; charset=utf-8";

        await foreach (var message in _events.SubscribeAsync(ct))
        {
            var payload = $"event: {message}\ndata: {{\"type\":\"{message}\"}}\n\n";
            await Response.WriteAsync(payload, Encoding.UTF8, ct);
            await Response.Body.FlushAsync(ct);
        }
    }

    private Guid GetUserId()
    {
        var value = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(value, out var userId))
            throw new InvalidOperationException("Invalid user id in token.");

        return userId;
    }
}
