using Microsoft.EntityFrameworkCore;
using VSMatch.Data;

namespace VSMatch.Services.Auth;

/// <summary>
/// Один раз на старте: если есть env-переменная INITIAL_ADMIN_VK_ID,
/// поднимаем флаг IsAdmin у пользователя с этим VK ID (если он уже зарегистрирован).
/// Если ещё не вошёл — отметится при следующем рестарте после его первого логина.
/// </summary>
public class AdminBootstrapper : BackgroundService
{
    private readonly IServiceProvider _services;
    private readonly IConfiguration _config;
    private readonly ILogger<AdminBootstrapper> _log;

    public AdminBootstrapper(IServiceProvider services, IConfiguration config, ILogger<AdminBootstrapper> log)
    {
        _services = services;
        _config = config;
        _log = log;
    }

    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        var vkId = _config["INITIAL_ADMIN_VK_ID"]?.Trim();
        if (string.IsNullOrEmpty(vkId)) return;

        try { await Task.Delay(TimeSpan.FromSeconds(5), ct); }
        catch (OperationCanceledException) { return; }

        try
        {
            using var scope = _services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            var user = await db.Users.FirstOrDefaultAsync(u => u.VkUserId == vkId, ct);
            if (user is null)
            {
                _log.LogInformation("AdminBootstrapper: пользователь vk_id={VkId} ещё не вошёл, ждём первого логина.", vkId);
                return;
            }

            if (!user.IsAdmin)
            {
                user.IsAdmin = true;
                await db.SaveChangesAsync(ct);
                _log.LogInformation("AdminBootstrapper: установлен IsAdmin=true для vk_id={VkId}", vkId);
            }
        }
        catch (Exception ex)
        {
            _log.LogError(ex, "AdminBootstrapper failed");
        }
    }
}
