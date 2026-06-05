namespace VSMatch.Data.Entities;

public class User
{
    public Guid Id { get; set; }
    public string VkUserId { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string? Email { get; set; }
    public bool IsAdmin { get; set; }
    public DateTime CreatedAt { get; set; }

    public ICollection<MatchPlayer> MatchPlayers { get; set; } = new List<MatchPlayer>();
    public ICollection<UserRating> Ratings { get; set; } = new List<UserRating>();
}
