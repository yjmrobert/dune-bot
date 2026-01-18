using DuneBot.Domain;
using Microsoft.EntityFrameworkCore;

namespace DuneBot.Data;

public class DuneDbContext : DbContext
{
    public DbSet<Game> Games { get; set; }

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
    }
}
