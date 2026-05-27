using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VSMatch.Data.Entities;
using VSMatch.Domain;
using VSMatch.Dtos.Matches;
using VSMatch.Services.Auth;
using VSMatch.Services.Matches;

namespace VSMatch.Controllers;

[ApiController]
[Authorize]
[Route("api/matches")]
public class MatchesController : ControllerBase
{
    private readonly IMatchService _matches;
    private readonly IMatchEventHub _events;
    private readonly ICurrentUser _currentUser;

    public MatchesController(IMatchService matches, IMatchEventHub events, ICurrentUser currentUser)
    {
        _matches = matches;
        _events = events;
        _currentUser = currentUser;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<MatchDto>>> GetAll(
        [FromQuery] Guid? courtId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 100,
        CancellationToken ct = default)
        => Ok(await _matches.GetAllAsync(courtId, page, pageSize, ct));

    [HttpGet("me/history")]
    public async Task<ActionResult<IReadOnlyList<MatchDto>>> GetMyHistory(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        CancellationToken ct = default)
        => Ok(await _matches.GetHistoryByUserAsync(_currentUser.Id, page, pageSize, ct));

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
            var created = await _matches.CreateAsync(req, _currentUser.Id, ct);
            return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
        }
        catch (AppException ex)
        {
            return ApiErrors.ToActionResult(ex);
        }
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<MatchDto>> Update(Guid id, UpdateMatchRequest req, CancellationToken ct)
    {
        try
        {
            var updated = await _matches.UpdateAsync(id, req, _currentUser.Id, ct);
            return updated is null ? NotFound() : Ok(updated);
        }
        catch (AppException ex)
        {
            return ApiErrors.ToActionResult(ex);
        }
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        try
        {
            return await _matches.DeleteAsync(id, _currentUser.Id, ct) ? NoContent() : NotFound();
        }
        catch (AppException ex)
        {
            return ApiErrors.ToActionResult(ex);
        }
    }

    [HttpPost("{id:guid}/players/me")]
    public async Task<ActionResult<MatchDto>> Join(Guid id, JoinMatchRequest? req, CancellationToken ct)
    {
        try
        {
            var match = await _matches.JoinAsync(id, _currentUser.Id, req?.Team ?? MatchTeam.TeamA, ct);
            return match is null ? NotFound() : Ok(match);
        }
        catch (AppException ex)
        {
            return ApiErrors.ToActionResult(ex);
        }
    }

    [HttpPost("invite/{inviteCode}/players/me")]
    public async Task<ActionResult<MatchDto>> JoinByInvite(string inviteCode, JoinMatchRequest? req, CancellationToken ct)
    {
        try
        {
            var match = await _matches.GetByInviteCodeAsync(inviteCode, ct);
            if (match is null) return NotFound();

            var joined = await _matches.JoinAsync(match.Id, _currentUser.Id, req?.Team ?? MatchTeam.TeamA, ct);
            return joined is null ? NotFound() : Ok(joined);
        }
        catch (AppException ex)
        {
            return ApiErrors.ToActionResult(ex);
        }
    }

    [HttpPost("{id:guid}/teams/shuffle")]
    public async Task<ActionResult<MatchDto>> ShuffleTeams(Guid id, CancellationToken ct)
    {
        try
        {
            var match = await _matches.ShuffleTeamsAsync(id, _currentUser.Id, ct);
            return match is null ? NotFound() : Ok(match);
        }
        catch (AppException ex)
        {
            return ApiErrors.ToActionResult(ex);
        }
    }

    [HttpPost("{id:guid}/result")]
    public async Task<ActionResult<MatchDto>> SubmitResult(Guid id, SubmitMatchResultRequest req, CancellationToken ct)
    {
        try
        {
            var match = await _matches.SubmitResultAsync(id, req, _currentUser.Id, ct);
            return match is null ? NotFound() : Ok(match);
        }
        catch (AppException ex)
        {
            return ApiErrors.ToActionResult(ex);
        }
    }

    [HttpDelete("{id:guid}/players/me")]
    public async Task<ActionResult<MatchDto>> Leave(Guid id, CancellationToken ct)
    {
        try
        {
            var match = await _matches.LeaveAsync(id, _currentUser.Id, ct);
            return match is null ? NotFound() : Ok(match);
        }
        catch (AppException ex)
        {
            return ApiErrors.ToActionResult(ex);
        }
    }

    [HttpGet("events")]
    public async Task Events(CancellationToken ct)
    {
        Response.Headers.CacheControl = "no-cache";
        Response.Headers["X-Accel-Buffering"] = "no";
        Response.ContentType = "text/event-stream; charset=utf-8";

        await Response.WriteAsync(": ok\n\n", Encoding.UTF8, ct);
        await Response.Body.FlushAsync(ct);

        var heartbeat = TimeSpan.FromSeconds(20);
        await using var enumerator = _events.SubscribeAsync(ct).GetAsyncEnumerator(ct);
        Task<bool>? moveNext = null;

        try
        {
            while (!ct.IsCancellationRequested)
            {
                moveNext ??= enumerator.MoveNextAsync().AsTask();
                var completed = await Task.WhenAny(moveNext, Task.Delay(heartbeat, ct));

                if (completed == moveNext)
                {
                    if (!await moveNext) break;
                    var message = enumerator.Current;
                    moveNext = null;
                    var payload = $"event: {message}\ndata: {{\"type\":\"{message}\"}}\n\n";
                    await Response.WriteAsync(payload, Encoding.UTF8, ct);
                }
                else
                {
                    await Response.WriteAsync(": ping\n\n", Encoding.UTF8, ct);
                }

                await Response.Body.FlushAsync(ct);
            }
        }
        catch (OperationCanceledException)
        {
        }
    }
}
