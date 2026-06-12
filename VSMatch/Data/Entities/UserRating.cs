using VSMatch.Domain.Sports;

namespace VSMatch.Data.Entities;

public class UserRating
{
    public Guid UserId { get; set; }
    public SportKind Sport { get; set; }
    public double Rating { get; set; } = Domain.Matches.RatingCalculator.InitialRating;

    public User? User { get; set; }
}
