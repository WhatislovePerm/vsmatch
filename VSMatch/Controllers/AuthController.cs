using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using VSMatch.Domain;
using VSMatch.Dtos.Auth;
using VSMatch.Options;
using VSMatch.Services.Auth;

namespace VSMatch.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _auth;
    private readonly ICurrentUser _currentUser;
    private readonly VkIdOptions _vkOpt;

    public AuthController(IAuthService auth, ICurrentUser currentUser, IOptions<VkIdOptions> vkOpt)
    {
        _auth = auth;
        _currentUser = currentUser;
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
        catch (AppException ex)
        {
            return ApiErrors.ToActionResult(ex);
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
        catch (AppException ex)
        {
            if (!string.IsNullOrEmpty(frontend))
                return Redirect($"{frontend}#error={Uri.EscapeDataString(ex.Message)}");
            return ApiErrors.ToActionResult(ex);
        }
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<ActionResult<MeDto>> Me(CancellationToken ct)
    {
        try
        {
            return Ok(await _auth.GetMeAsync(_currentUser.Id, ct));
        }
        catch (AppException ex)
        {
            return ApiErrors.ToActionResult(ex);
        }
    }

    [Authorize]
    [HttpPut("me")]
    public async Task<ActionResult<AuthResponse>> UpdateMe(UpdateProfileRequest req, CancellationToken ct)
    {
        try
        {
            return Ok(await _auth.UpdateProfileAsync(_currentUser.Id, req, ct));
        }
        catch (AppException ex)
        {
            return ApiErrors.ToActionResult(ex);
        }
    }
}
