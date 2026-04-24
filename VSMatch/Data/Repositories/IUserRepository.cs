using VSMatch.Data.Entities;

namespace VSMatch.Data.Repositories;

public interface IUserRepository : IBaseRepository<User>
{
    Task<User?> GetByVkUserIdAsync(string vkUserId, CancellationToken ct = default);
}
