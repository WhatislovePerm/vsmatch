using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;

namespace VSMatch.Data.Repositories;

public abstract class BaseRepository<T> : IBaseRepository<T> where T : class
{
    protected readonly AppDbContext Db;
    protected readonly DbSet<T> Set;

    protected BaseRepository(AppDbContext db)
    {
        Db = db;
        Set = db.Set<T>();
    }

    public virtual Task<T?> GetByIdAsync(Guid id, CancellationToken ct = default)
        => Set.FindAsync(new object[] { id }, ct).AsTask();

    public virtual async Task<IReadOnlyList<T>> ListAsync(CancellationToken ct = default)
        => await Set.AsNoTracking().ToListAsync(ct);

    public virtual async Task<IReadOnlyList<T>> FindAsync(Expression<Func<T, bool>> predicate, CancellationToken ct = default)
        => await Set.AsNoTracking().Where(predicate).ToListAsync(ct);

    public virtual async Task AddAsync(T entity, CancellationToken ct = default)
        => await Set.AddAsync(entity, ct);

    public virtual async Task AddRangeAsync(IEnumerable<T> entities, CancellationToken ct = default)
        => await Set.AddRangeAsync(entities, ct);

    public virtual void Update(T entity) => Set.Update(entity);

    public virtual void Remove(T entity) => Set.Remove(entity);

    public Task<int> SaveChangesAsync(CancellationToken ct = default) => Db.SaveChangesAsync(ct);
}
