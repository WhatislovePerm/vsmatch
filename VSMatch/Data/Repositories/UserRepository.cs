using Microsoft.EntityFrameworkCore;
using VSMatch.Data.Entities;

namespace VSMatch.Data.Repositories;

public class UserRepository : BaseRepository<User>, IUserRepository
{
    public UserRepository(AppDbContext db) : base(db) { }

    public Task<User?> GetByVkUserIdAsync(string vkUserId, CancellationToken ct = default)
        => Set.FirstOrDefaultAsync(u => u.VkUserId == vkUserId, ct);
}
