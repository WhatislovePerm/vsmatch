namespace VSMatch.Data.Entities;

public class Match
{
    public Guid Id { get; set; }
    public Guid CourtId { get; set; }
    public Guid CreatedByUserId { get; set; }
    public string InviteCode { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime StartsAtUtc { get; set; }
    public int DurationMinutes { get; set; }
    public int MaxPlayers { get; set; }
    public MatchStatus Status { get; set; } = MatchStatus.Scheduled;
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }

    public Court? Court { get; set; }
    public User? CreatedByUser { get; set; }
    public ICollection<MatchPlayer> Players { get; set; } = new List<MatchPlayer>();
}

public enum MatchStatus
{
    Scheduled = 0,
    Ready = 1,
    InProgress = 2,
    Completed = 3,
    Cancelled = 4,
}
