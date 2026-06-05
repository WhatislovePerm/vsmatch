using Microsoft.EntityFrameworkCore;
using VSMatch.Data.Entities;

namespace VSMatch.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Court> Courts => Set<Court>();
    public DbSet<User> Users => Set<User>();
    public DbSet<UserRating> UserRatings => Set<UserRating>();
    public DbSet<Match> Matches => Set<Match>();
    public DbSet<MatchPlayer> MatchPlayers => Set<MatchPlayer>();
    public DbSet<Feedback> Feedbacks => Set<Feedback>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<Court>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasIndex(x => x.OsmId).IsUnique();
            e.HasIndex(x => x.SportKind);
            e.Property(x => x.Name).HasMaxLength(256).IsRequired();
            e.Property(x => x.Address).HasMaxLength(512);
            e.Property(x => x.Description).HasMaxLength(1024);
            e.Property(x => x.Sport).HasMaxLength(64);
            e.Property(x => x.Surface).HasMaxLength(64);
            e.Property(x => x.SportKind).HasConversion<string>().HasMaxLength(32).HasDefaultValue(Domain.Sports.SportKind.Football);
            e.Property(x => x.IsFree).HasDefaultValue(true);
        });

        b.Entity<User>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasIndex(x => x.VkUserId).IsUnique();
            e.Property(x => x.VkUserId).HasMaxLength(64).IsRequired();
            e.Property(x => x.DisplayName).HasMaxLength(256).IsRequired();
            e.Property(x => x.Email).HasMaxLength(256);
            e.Property(x => x.IsAdmin).HasDefaultValue(false);
        });

        b.Entity<UserRating>(e =>
        {
            e.HasKey(x => new { x.UserId, x.Sport });
            e.Property(x => x.Sport).HasConversion<string>().HasMaxLength(32);
            e.Property(x => x.Rating).HasDefaultValue(1000);
            e.HasOne(x => x.User)
                .WithMany(x => x.Ratings)
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        b.Entity<Match>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasIndex(x => x.CourtId);
            e.HasIndex(x => new { x.CourtId, x.Status });
            e.HasIndex(x => x.Sport);
            e.HasIndex(x => x.CreatedByUserId);
            e.HasIndex(x => x.InviteCode).IsUnique();
            e.Property(x => x.InviteCode).HasMaxLength(32).IsRequired();
            e.Property(x => x.Title).HasMaxLength(256).IsRequired();
            e.Property(x => x.Description).HasMaxLength(1024);
            e.Property(x => x.TeamAName).HasMaxLength(64).HasDefaultValue("Команда A");
            e.Property(x => x.TeamBName).HasMaxLength(64).HasDefaultValue("Команда B");
            e.Property(x => x.Status).HasConversion<string>().HasMaxLength(32);
            e.Property(x => x.Sport).HasConversion<string>().HasMaxLength(32).HasDefaultValue(Domain.Sports.SportKind.Football);

            e.HasOne(x => x.Court)
                .WithMany(x => x.Matches)
                .HasForeignKey(x => x.CourtId)
                .OnDelete(DeleteBehavior.Cascade);

            e.HasOne(x => x.CreatedByUser)
                .WithMany()
                .HasForeignKey(x => x.CreatedByUserId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        b.Entity<MatchPlayer>(e =>
        {
            e.HasKey(x => new { x.MatchId, x.UserId });
            e.HasIndex(x => x.UserId);
            e.Property(x => x.Team).HasConversion<string>().HasMaxLength(16).HasDefaultValue(MatchTeam.TeamA);

            e.HasOne(x => x.Match)
                .WithMany(x => x.Players)
                .HasForeignKey(x => x.MatchId)
                .OnDelete(DeleteBehavior.Cascade);

            e.HasOne(x => x.User)
                .WithMany(x => x.MatchPlayers)
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        b.Entity<Feedback>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasIndex(x => x.UserId);
            e.HasIndex(x => x.Status);
            e.HasIndex(x => x.CreatedAt);
            e.Property(x => x.Message).HasMaxLength(2000).IsRequired();
            e.Property(x => x.Reply).HasMaxLength(2000);
            e.Property(x => x.Status).HasConversion<string>().HasMaxLength(32).HasDefaultValue(FeedbackStatus.New);

            e.HasOne(x => x.User)
                .WithMany()
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
