using System.Text;

namespace VSMatch.Options;

public static class AppConfigurationValidator
{
    private const int MinimumJwtKeyBytes = 32;

    public static void Validate(JwtOptions jwt, VkIdOptions vkId, bool allowLoopbackHttp = false)
    {
        var errors = new List<string>();

        if (IsMissing(jwt.Issuer))
            errors.Add("Jwt__Issuer is required.");
        if (IsMissing(jwt.Audience))
            errors.Add("Jwt__Audience is required.");
        if (IsMissing(jwt.Key) || Encoding.UTF8.GetByteCount(jwt.Key) < MinimumJwtKeyBytes)
            errors.Add($"Jwt__Key must contain at least {MinimumJwtKeyBytes} bytes and must not be a placeholder.");

        if (IsMissing(vkId.ClientId))
            errors.Add("VkId__ClientId is required.");
        if (IsMissing(vkId.ClientSecret))
            errors.Add("VkId__ClientSecret is required and must not be a placeholder.");
        if (!IsAllowedRedirectUri(vkId.RedirectUri, allowLoopbackHttp))
            errors.Add("VkId__RedirectUri must be an absolute HTTPS URL.");
        if (!IsAllowedRedirectUri(vkId.FrontendRedirectUrl, allowLoopbackHttp))
            errors.Add("VkId__FrontendRedirectUrl must be an absolute HTTPS URL.");

        if (errors.Count > 0)
        {
            throw new InvalidOperationException(
                "Invalid application configuration. Supply secrets through environment variables " +
                "or .NET User Secrets. " + string.Join(' ', errors));
        }
    }

    private static bool IsMissing(string? value)
        => string.IsNullOrWhiteSpace(value)
           || value.Contains("CHANGE_ME", StringComparison.OrdinalIgnoreCase);

    private static bool IsAllowedRedirectUri(string? value, bool allowLoopbackHttp)
    {
        if (!Uri.TryCreate(value, UriKind.Absolute, out var uri))
            return false;

        if (uri.Scheme == Uri.UriSchemeHttps)
            return true;

        return allowLoopbackHttp
               && uri.Scheme == Uri.UriSchemeHttp
               && (uri.IsLoopback || uri.Host.Equals("localhost", StringComparison.OrdinalIgnoreCase));
    }
}
