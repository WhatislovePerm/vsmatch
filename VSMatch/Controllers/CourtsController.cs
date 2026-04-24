using Microsoft.AspNetCore.Mvc;
using VSMatch.Dtos.Courts;
using VSMatch.Services.Courts;

namespace VSMatch.Controllers;

[ApiController]
[Route("api/courts")]
public class CourtsController : ControllerBase
{
    private readonly ICourtService _courts;

    public CourtsController(ICourtService courts) => _courts = courts;

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<CourtDto>>> GetAll(CancellationToken ct)
        => Ok(await _courts.GetAllAsync(ct));

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<CourtDto>> GetById(Guid id, CancellationToken ct)
    {
        var court = await _courts.GetByIdAsync(id, ct);
        return court is null ? NotFound() : Ok(court);
    }
}
