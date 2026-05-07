namespace VSMatch.Data.Entities;

public class MatchPlayer
{
    public Guid MatchId { get; set; }
    public Guid UserId { get; set; }
    public DateTime JoinedAt { get; set; }

    public Match? Match { get; set; }
    public User? User { get; set; }
}
