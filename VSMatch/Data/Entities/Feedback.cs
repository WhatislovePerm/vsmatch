namespace VSMatch.Data.Entities;

public class Feedback
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Message { get; set; } = string.Empty;
    public FeedbackStatus Status { get; set; } = FeedbackStatus.New;
    public string? Reply { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }

    public User? User { get; set; }
}

public enum FeedbackStatus
{
    New = 0,
    InProgress = 1,
    Resolved = 2,
}
