namespace VSMatch.Data.Entities;

public class Court
{
    public Guid Id { get; set; }
    public long OsmId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public double Lat { get; set; }
    public double Lon { get; set; }
    public string? Sport { get; set; }
    public string? Surface { get; set; }
    public double? Rating { get; set; }
    public bool IsFree { get; set; } = true;
    public DateTime CreatedAt { get; set; }

    public ICollection<Match> Matches { get; set; } = new List<Match>();
}
