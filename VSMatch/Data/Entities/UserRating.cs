using VSMatch.Domain.Sports;

namespace VSMatch.Data.Entities;

public class UserRating
{
    public Guid UserId { get; set; }
    public SportKind Sport { get; set; }
    public double Rating { get; set; } = 1000;

    public User? User { get; set; }
}
