namespace VSMatch.Data.Entities;

public class MatchPlayer
{
    public Guid MatchId { get; set; }
    public Guid UserId { get; set; }
    public MatchTeam Team { get; set; } = MatchTeam.TeamA;
    public int Goals { get; set; }
    public int Assists { get; set; }
    public double RatingDelta { get; set; }
    public DateTime JoinedAt { get; set; }

    public Match? Match { get; set; }
    public User? User { get; set; }
}
