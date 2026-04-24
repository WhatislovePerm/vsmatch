using System.Net.Http.Json;
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

    public VkIdClient(HttpClient http, IOptions<VkIdOptions> opt)
    {
        _http = http;
        _opt = opt.Value;
    }

    public async Task<VkIdTokenResult> ExchangeCodeAsync(string code, string codeVerifier, CancellationToken ct)
    {
        var form = new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["grant_type"] = "authorization_code",
            ["client_id"] = _opt.ClientId,
            ["client_secret"] = _opt.ClientSecret,
            ["redirect_uri"] = _opt.RedirectUri,
            ["code"] = code,
            ["code_verifier"] = codeVerifier,
        });

        using var resp = await _http.PostAsync(TokenEndpoint, form, ct);
        if (!resp.IsSuccessStatusCode)
        {
            var body = await resp.Content.ReadAsStringAsync(ct);
            throw new InvalidOperationException($"VK ID token exchange failed: {(int)resp.StatusCode} {body}");
        }

        var token = await resp.Content.ReadFromJsonAsync<TokenBody>(cancellationToken: ct)
                    ?? throw new InvalidOperationException("Empty VK ID token response.");

        return new VkIdTokenResult(token.access_token, token.expires_in, token.user_id);
    }

    public async Task<VkIdUserInfo> GetUserInfoAsync(string accessToken, CancellationToken ct)
    {
        // VK ID /oauth2/user_info: POST form-urlencoded с client_id + access_token в теле
        var form = new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["client_id"] = _opt.ClientId,
            ["access_token"] = accessToken,
        });

        using var resp = await _http.PostAsync(UserInfoEndpoint, form, ct);
        var raw = await resp.Content.ReadAsStringAsync(ct);
        if (!resp.IsSuccessStatusCode)
            throw new InvalidOperationException($"VK ID user_info failed: {(int)resp.StatusCode} {raw}");

        var info = System.Text.Json.JsonSerializer.Deserialize<UserInfoBody>(raw)
                   ?? throw new InvalidOperationException("Empty VK ID user_info response.");

        var userId = info.user?.user_id ?? info.user_id
                     ?? throw new InvalidOperationException($"VK ID did not return user_id. Raw: {raw}");

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
        [JsonPropertyName("user_id")] public string? user_id { get; set; }
    }

    private class UserInfoBody
    {
        [JsonPropertyName("user")] public UserInfoUser? user { get; set; }
        [JsonPropertyName("user_id")] public string? user_id { get; set; }
        [JsonPropertyName("email")] public string? email { get; set; }
        [JsonPropertyName("first_name")] public string? first_name { get; set; }
        [JsonPropertyName("last_name")] public string? last_name { get; set; }
    }

    private class UserInfoUser
    {
        [JsonPropertyName("user_id")] public string? user_id { get; set; }
        [JsonPropertyName("email")] public string? email { get; set; }
        [JsonPropertyName("first_name")] public string? first_name { get; set; }
        [JsonPropertyName("last_name")] public string? last_name { get; set; }
    }
}
