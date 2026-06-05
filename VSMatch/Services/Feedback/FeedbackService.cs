using Microsoft.EntityFrameworkCore;
using VSMatch.Data;
using VSMatch.Data.Entities;
using VSMatch.Domain;
using VSMatch.Domain.Moderation;
using VSMatch.Dtos.Feedback;

namespace VSMatch.Services.Feedback;

public class FeedbackService : IFeedbackService
{
    private readonly AppDbContext _db;
    private readonly IContentModerator _moderator;

    public FeedbackService(AppDbContext db, IContentModerator moderator)
    {
        _db = db;
        _moderator = moderator;
    }

    public async Task<FeedbackDto> CreateAsync(Guid userId, CreateFeedbackRequest req, CancellationToken ct = default)
    {
        var text = req.Message?.Trim();
        if (string.IsNullOrEmpty(text))
            throw new ValidationException("Сообщение не может быть пустым.");
        if (text.Length > 2000)
            throw new ValidationException("Сообщение — не более 2000 символов.");

        _moderator.EnsureClean(text, "Сообщение");

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId, ct)
            ?? throw new NotFoundException("Пользователь не найден.");

        var fb = new VSMatch.Data.Entities.Feedback
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Message = text,
            Status = FeedbackStatus.New,
            CreatedAt = DateTime.UtcNow,
        };
        _db.Feedbacks.Add(fb);
        await _db.SaveChangesAsync(ct);
        fb.User = user;
        return ToDto(fb);
    }

    public async Task<IReadOnlyList<FeedbackDto>> ListAllAsync(int page, int pageSize, CancellationToken ct = default)
    {
        var p = Math.Max(1, page);
        var ps = Math.Clamp(pageSize <= 0 ? 50 : pageSize, 1, 200);

        var items = await _db.Feedbacks
            .Include(f => f.User)
            .AsNoTracking()
            .OrderByDescending(f => f.CreatedAt)
            .Skip((p - 1) * ps)
            .Take(ps)
            .ToListAsync(ct);

        return items.Select(ToDto).ToList();
    }

    public async Task<FeedbackDto?> UpdateAsync(Guid id, UpdateFeedbackRequest req, CancellationToken ct = default)
    {
        var fb = await _db.Feedbacks.Include(f => f.User).FirstOrDefaultAsync(f => f.Id == id, ct);
        if (fb is null) return null;

        fb.Status = req.Status;
        var reply = req.Reply?.Trim();
        if (!string.IsNullOrEmpty(reply))
            _moderator.EnsureClean(reply, "Ответ");
        fb.Reply = string.IsNullOrEmpty(reply) ? null : reply;
        fb.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync(ct);
        return ToDto(fb);
    }

    private static FeedbackDto ToDto(VSMatch.Data.Entities.Feedback f) => new(
        f.Id,
        f.UserId,
        f.User?.DisplayName ?? f.UserId.ToString(),
        f.User?.VkUserId,
        f.Message,
        f.Status,
        f.Reply,
        f.CreatedAt,
        f.UpdatedAt);
}
