using DuneBot.Domain;
using Microsoft.EntityFrameworkCore;

namespace DuneBot.Data;

public class DuneDbContext : DbContext
{
    public DbSet<Game> Games { get; set; }
    public DbSet<TreacheryCard> TreacheryCards { get; set; }

    public DuneDbContext(DbContextOptions<DuneDbContext> options) : base(options)
    {
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Game>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Ignore(e => e.State); // Don't map the helper property
        });

        modelBuilder.Entity<TreacheryCard>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(100);
            entity.Property(e => e.Type).IsRequired().HasMaxLength(50);
            entity.Property(e => e.Description).HasMaxLength(500);
            
            // Create index on Name for quick lookups
            entity.HasIndex(e => e.Name).IsUnique();
            entity.HasIndex(e => e.Type);
        });
    }
}
