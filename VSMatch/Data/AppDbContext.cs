using Microsoft.EntityFrameworkCore;
using VSMatch.Data.Entities;

namespace VSMatch.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Court> Courts => Set<Court>();
    public DbSet<User> Users => Set<User>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<Court>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasIndex(x => x.OsmId).IsUnique();
            e.Property(x => x.Name).HasMaxLength(256).IsRequired();
            e.Property(x => x.Description).HasMaxLength(1024);
            e.Property(x => x.Sport).HasMaxLength(64);
            e.Property(x => x.Surface).HasMaxLength(64);
        });

        b.Entity<User>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasIndex(x => x.VkUserId).IsUnique();
            e.Property(x => x.VkUserId).HasMaxLength(64).IsRequired();
            e.Property(x => x.DisplayName).HasMaxLength(256).IsRequired();
            e.Property(x => x.Email).HasMaxLength(256);
        });
    }
}
