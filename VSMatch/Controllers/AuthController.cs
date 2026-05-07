using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using System.Security.Claims;
using VSMatch.Dtos.Auth;
using VSMatch.Options;
using VSMatch.Services.Auth;

namespace VSMatch.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _auth;
    private readonly VkIdOptions _vkOpt;

    public AuthController(IAuthService auth, IOptions<VkIdOptions> vkOpt)
    {
        _auth = auth;
        _vkOpt = vkOpt.Value;
    }

    // Для браузера: 302 на VK ID
    [HttpGet("vkid/start")]
    public IActionResult VkIdStart() => Redirect(_auth.BuildVkIdAuthorizeUrl());

    // Для мобильных/SPA клиентов: вернуть URL строкой
    [HttpGet("vkid/url")]
    public ActionResult<VkIdAuthorizeUrlDto> VkIdUrl() => Ok(new VkIdAuthorizeUrlDto(_auth.BuildVkIdAuthorizeUrl()));

    // Для мобильных SDK с Confidential Flow:
    // приложение само генерит PKCE и присылает все 5 полей в теле POST.
    [HttpPost("vkid/exchange")]
    public async Task<ActionResult<AuthResponse>> VkIdExchange(
        [FromBody] VkIdExchangeRequest req,
        CancellationToken ct)
    {
        try
        {
            return Ok(await _auth.ExchangeVkIdCodeAsync(req, ct));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpGet("vkid/callback")]
    public async Task<IActionResult> VkIdCallback(
        [FromQuery] string code,
        [FromQuery] string state,
        [FromQuery(Name = "device_id")] string? deviceId,
        CancellationToken ct)
    {
        var frontend = _vkOpt.FrontendRedirectUrl;
        try
        {
            var res = await _auth.HandleVkIdCallbackAsync(code, state, deviceId, ct);
            if (!string.IsNullOrEmpty(frontend))
            {
                var url = $"{frontend}#token={Uri.EscapeDataString(res.AccessToken)}" +
                          $"&expiresAt={Uri.EscapeDataString(res.ExpiresAt.ToString("o"))}";
                return Redirect(url);
            }
            return Ok(res);
        }
        catch (InvalidOperationException ex)
        {
            if (!string.IsNullOrEmpty(frontend))
                return Redirect($"{frontend}#error={Uri.EscapeDataString(ex.Message)}");
            return BadRequest(new { error = ex.Message });
        }
    }

    [Authorize]
    [HttpGet("me")]
    public ActionResult<object> Me() => Ok(new
    {
        userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value,
        name = User.Identity?.Name,
        vkUserId = User.FindFirst("vk_user_id")?.Value,
        email = User.FindFirst(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Email)?.Value,
    });

    [Authorize]
    [HttpPut("me")]
    public async Task<ActionResult<AuthResponse>> UpdateMe(UpdateProfileRequest req, CancellationToken ct)
    {
        try
        {
            return Ok(await _auth.UpdateProfileAsync(GetUserId(), req, ct));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
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
