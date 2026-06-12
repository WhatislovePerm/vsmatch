namespace VSMatch.Dtos.Auth;

/// <summary>
/// Результат VK-callback: токен + invite-код матча, если логин начинался с инвайт-ссылки.
/// Invite хранится на сервере (в state store), поэтому переживает смену браузера
/// (например, Telegram webview → системный Safari).
/// </summary>
public record VkIdCallbackResult(AuthResponse Auth, string? InviteCode);
