using VSMatch.Dtos.Feedback;

namespace VSMatch.Services.Feedback;

public interface IFeedbackService
{
    Task<FeedbackDto> CreateAsync(Guid userId, CreateFeedbackRequest req, CancellationToken ct = default);
    Task<IReadOnlyList<FeedbackDto>> ListAllAsync(int page, int pageSize, CancellationToken ct = default);
    Task<FeedbackDto?> UpdateAsync(Guid id, UpdateFeedbackRequest req, CancellationToken ct = default);
}
