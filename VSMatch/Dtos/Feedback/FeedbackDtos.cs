using System.ComponentModel.DataAnnotations;
using VSMatch.Data.Entities;

namespace VSMatch.Dtos.Feedback;

public record FeedbackDto(
    Guid Id,
    Guid UserId,
    string AuthorName,
    string? AuthorVkUserId,
    string Message,
    FeedbackStatus Status,
    string? Reply,
    DateTime CreatedAt,
    DateTime? UpdatedAt
);

public record CreateFeedbackRequest(
    [Required, MinLength(3), MaxLength(2000)] string Message
);

public record UpdateFeedbackRequest(
    FeedbackStatus Status,
    [MaxLength(2000)] string? Reply
);
