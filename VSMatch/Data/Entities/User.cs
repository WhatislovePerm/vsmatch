namespace VSMatch.Data.Entities;

public class User
{
    public Guid Id { get; set; }
    public string VkUserId { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string? Email { get; set; }
    public DateTime CreatedAt { get; set; }
}
