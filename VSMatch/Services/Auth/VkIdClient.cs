using System.Text.Json.Serialization;
using Microsoft.Extensions.Options;
using VSMatch.Options;

namespace VSMatch.Services.Auth;

public class VkIdClient : IVkIdClient
{
    private const string TokenEndpoint = "https://id.vk.ru/oauth2/auth";
    private const string UserInfoEndpoint = "https://id.vk.ru/oauth2/user_info";

    private readonly HttpClient _http;
    private readonly VkIdOptions _opt;
    private readonly ILogger<VkIdClient> _log;

    public VkIdClient(HttpClient http, IOptions<VkIdOptions> opt, ILogger<VkIdClient> log)
    {
        _http = http;
        _opt = opt.Value;
        _log = log;
    }

    public async Task<VkIdTokenResult> ExchangeCodeAsync(
        string code,
        string codeVerifier,
        string? deviceId,
        string? redirectUriOverride,
        CancellationToken ct)
    {
        var fields = new Dictionary<string, string>
        {
            ["grant_type"] = "authorization_code",
            ["client_id"] = _opt.ClientId,
            ["client_secret"] = _opt.ClientSecret,
            ["redirect_uri"] = string.IsNullOrEmpty(redirectUriOverride) ? _opt.RedirectUri : redirectUriOverride,
            ["code"] = code,
            ["code_verifier"] = codeVerifier,
        };
        if (!string.IsNullOrEmpty(deviceId)) fields["device_id"] = deviceId;
        var form = new FormUrlEncodedContent(fields);

        using var resp = await _http.PostAsync(TokenEndpoint, form, ct);
        var raw = await resp.Content.ReadAsStringAsync(ct);
        if (!resp.IsSuccessStatusCode)
            throw new InvalidOperationException($"VK ID token exchange failed: {(int)resp.StatusCode} {raw}");

        _log.LogInformation("VK ID token response: {Raw}", raw);

        var token = System.Text.Json.JsonSerializer.Deserialize<TokenBody>(raw)
                    ?? throw new InvalidOperationException("Empty VK ID token response.");

        if (string.IsNullOrEmpty(token.access_token))
            throw new InvalidOperationException($"VK ID token response missing access_token. Raw: {raw}");

        return new VkIdTokenResult(token.access_token, token.expires_in, token.user_id?.ToString());
    }

    public async Task<VkIdUserInfo?> TryGetUserInfoAsync(string accessToken, CancellationToken ct)
    {
        var form = new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["client_id"] = _opt.ClientId,
            ["access_token"] = accessToken,
        });

        using var resp = await _http.PostAsync(UserInfoEndpoint, form, ct);
        var raw = await resp.Content.ReadAsStringAsync(ct);
        _log.LogInformation("VK ID user_info response: {Raw}", raw);

        if (!resp.IsSuccessStatusCode) return null;

        UserInfoBody? info;
        try { info = System.Text.Json.JsonSerializer.Deserialize<UserInfoBody>(raw); }
        catch { return null; }
        if (info is null) return null;

        var userId = (info.user?.user_id ?? info.user_id)?.ToString();
        if (string.IsNullOrEmpty(userId)) return null;

        return new VkIdUserInfo(
            userId,
            info.user?.email ?? info.email,
            info.user?.first_name ?? info.first_name,
            info.user?.last_name ?? info.last_name);
    }

    private class TokenBody
    {
        [JsonPropertyName("access_token")] public string access_token { get; set; } = "";
        [JsonPropertyName("expires_in")] public int expires_in { get; set; }
        [JsonPropertyName("user_id")] public long? user_id { get; set; }
    }

    private class UserInfoBody
    {
        [JsonPropertyName("user")] public UserInfoUser? user { get; set; }
        [JsonPropertyName("user_id")] public long? user_id { get; set; }
        [JsonPropertyName("email")] public string? email { get; set; }
        [JsonPropertyName("first_name")] public string? first_name { get; set; }
        [JsonPropertyName("last_name")] public string? last_name { get; set; }
    }

    private class UserInfoUser
    {
        [JsonPropertyName("user_id")] public long? user_id { get; set; }
        [JsonPropertyName("email")] public string? email { get; set; }
        [JsonPropertyName("first_name")] public string? first_name { get; set; }
        [JsonPropertyName("last_name")] public string? last_name { get; set; }
    }
}
