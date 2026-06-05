using VSMatch.Data.Entities;

namespace VSMatch.Data.Repositories;

public interface IUserRepository : IBaseRepository<User>
{
    Task<User?> GetProfileByIdAsync(Guid id, CancellationToken ct = default);
    Task<User?> GetByVkUserIdAsync(string vkUserId, CancellationToken ct = default);
}
