using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VSMatch.Domain.Sports;
using VSMatch.Dtos.Courts;
using VSMatch.Services.Courts;

namespace VSMatch.Controllers;

[ApiController]
[Authorize]
[Route("api/courts")]
public class CourtsController : ControllerBase
{
    private readonly ICourtService _courts;

    public CourtsController(ICourtService courts) => _courts = courts;

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<CourtDto>>> GetAll(
        [FromQuery] SportKind? sport,
        CancellationToken ct)
        => Ok(await _courts.GetAllAsync(sport ?? SportCatalog.DefaultSport, ct));

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<CourtDto>> GetById(Guid id, CancellationToken ct)
    {
        var court = await _courts.GetByIdAsync(id, ct);
        return court is null ? NotFound() : Ok(court);
    }

    [HttpGet("{id:guid}/top-players")]
    public async Task<ActionResult<IReadOnlyList<TopPlayerDto>>> GetTopPlayers(
        Guid id,
        [FromQuery] SportKind? sport,
        CancellationToken ct)
        => Ok(await _courts.GetTopPlayersAsync(id, sport ?? SportCatalog.DefaultSport, top: 3, ct));
}
