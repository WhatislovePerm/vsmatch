namespace VSMatch.Options;

public class VkIdOptions
{
    public string ClientId { get; set; } = string.Empty;
    public string ClientSecret { get; set; } = string.Empty;
    public string RedirectUri { get; set; } = string.Empty;
    public string Scope { get; set; } = "vkid.personal_info email";
    public string FrontendRedirectUrl { get; set; } = string.Empty;
}
