using DuneBot.Domain;
using Microsoft.EntityFrameworkCore;

namespace DuneBot.Data;

/// <summary>
/// Extension methods for seeding Treachery Card data into the database.
/// </summary>
public static class TreacheryCardSeedData
{
    /// <summary>
    /// Seeds the Treachery Cards table with all Dune cards.
    /// Call this method during database initialization or migration.
    /// </summary>
    /// <param name="context">The DuneDbContext to seed</param>
    public static void SeedTreacheryCards(this DuneDbContext context)
    {
        // Check if we need to clean up placeholders from previous runs
        if (context.TreacheryCards.Any(c => c.Name.Contains("PLACEHOLDER")))
        {
            context.TreacheryCards.RemoveRange(context.TreacheryCards);
            context.SaveChanges();
        }

        // Check if cards already exist (and aren't placeholders)
        if (context.TreacheryCards.Any())
        {
            return; // Already seeded
        }

        var cards = GetTreacheryCards();
        context.TreacheryCards.AddRange(cards);
        context.SaveChanges();
    }

    /// <summary>
    /// Returns the complete list of 33 Treachery Cards in the Dune game.
    /// </summary>
    private static List<TreacheryCard> GetTreacheryCards()
    {
        var cards = new List<TreacheryCard>();
        int id = 1;

        // ==========================================================
        // WEAPONS - PROJECTILE (4)
        // ==========================================================
        cards.Add(new TreacheryCard
        {
            Id = id++,
            Name = "Maula Pistol",
            Type = "Weapon - Projectile",
            Description = "A projectile weapon. Kills opponent's leader unless they play a Shield.",
            IsWeapon = true
        });
        cards.Add(new TreacheryCard
        {
            Id = id++,
            Name = "Crysknife",
            Type = "Weapon - Projectile",
            Description = "A projectile weapon (sacred blade). Kills opponent's leader unless they play a Shield.",
            IsWeapon = true
        });
        cards.Add(new TreacheryCard
        {
            Id = id++,
            Name = "Stunner",
            Type = "Weapon - Projectile",
            Description = "A projectile weapon. Kills opponent's leader unless they play a Shield.",
            IsWeapon = true
        });
        cards.Add(new TreacheryCard
        {
            Id = id++,
            Name = "Slip-Tip",
            Type = "Weapon - Projectile",
            Description = "A projectile weapon. Kills opponent's leader unless they play a Shield.",
            IsWeapon = true
        });

        // ==========================================================
        // WEAPONS - POISON (4)
        // ==========================================================
        cards.Add(new TreacheryCard
        {
            Id = id++,
            Name = "Chaumas",
            Type = "Weapon - Poison",
            Description = "A poison weapon. Kills opponent's leader unless they play a Snooper.",
            IsWeapon = true
        });
        cards.Add(new TreacheryCard
        {
            Id = id++,
            Name = "Chaumurky",
            Type = "Weapon - Poison",
            Description = "A poison weapon. Kills opponent's leader unless they play a Snooper.",
            IsWeapon = true
        });
        cards.Add(new TreacheryCard
        {
            Id = id++,
            Name = "Ellaca Drug",
            Type = "Weapon - Poison",
            Description = "A poison weapon. Kills opponent's leader unless they play a Snooper.",
            IsWeapon = true
        });
        cards.Add(new TreacheryCard
        {
            Id = id++,
            Name = "Gom Jabbar",
            Type = "Weapon - Poison",
            Description = "A specific poison needle. Kills opponent's leader unless they play a Snooper.",
            IsWeapon = true
        });

        // ==========================================================
        // WEAPONS - LASGUN (1)
        // ==========================================================
        cards.Add(new TreacheryCard
        {
            Id = id++,
            Name = "Lasgun",
            Type = "Weapon - Lasgun",
            Description = "Special weapon. Kills opponent's leader. If a Shield is played in the same battle, an atomic explosion occurs.",
            IsWeapon = true
        });

        // ==========================================================
        // DEFENSES - PROJECTILE (4 Shields)
        // ==========================================================
        for (int i = 1; i <= 4; i++)
        {
            cards.Add(new TreacheryCard
            {
                Id = id++,
                Name = $"Shield #{i}",
                Type = "Defense - Projectile",
                Description = "Defense against Projectile weapons. Creates atomic explosion if hit by Lasgun.",
                IsDefense = true
            });
        }

        // ==========================================================
        // DEFENSES - POISON (4 Snoopers)
        // ==========================================================
        for (int i = 1; i <= 4; i++)
        {
            cards.Add(new TreacheryCard
            {
                Id = id++,
                Name = $"Snooper #{i}",
                Type = "Defense - Poison",
                Description = "Defense against Poison weapons.",
                IsDefense = true
            });
        }

        // ==========================================================
        // SPECIAL - WORTHLESS (5)
        // ==========================================================
        var worthless = new[] { "Baliset", "Jubba Cloak", "Kulon", "La La La!", "Trip to Gamont" };
        foreach (var name in worthless)
        {
            cards.Add(new TreacheryCard
            {
                Id = id++,
                Name = name,
                Type = "Special - Worthless",
                Description = "Worthless card. Play as a weapon, defense, or both in battle with no effect.",
                IsSpecial = true
            });
        }

        // ==========================================================
        // SPECIAL - UNIQUE (11)
        // ==========================================================
        cards.Add(new TreacheryCard
        {
            Id = id++,
            Name = "Family Atomics",
            Type = "Special - Unique",
            Description = "Play to destroy the Shield Wall. Forces on Shield Wall are destroyed.",
            IsSpecial = true
        });
        cards.Add(new TreacheryCard
        {
            Id = id++,
            Name = "Weather Control",
            Type = "Special - Unique",
            Description = "Play during Storm phase to control the storm movement (0-10 sectors).",
            IsSpecial = true
        });
        cards.Add(new TreacheryCard
        {
            Id = id++,
            Name = "Hajr",
            Type = "Special - Unique",
            Description = "Play during Movement to make an extra on-planet move.",
            IsSpecial = true
        });
        cards.Add(new TreacheryCard
        {
            Id = id++,
            Name = "Tleilaxu Ghola",
            Type = "Special - Unique",
            Description = "Play to revive 1 leader or 5 forces from the tanks for free.",
            IsSpecial = true
        });
        
        // Truthtrance x2
        cards.Add(new TreacheryCard
        {
            Id = id++,
            Name = "Truthtrance #1",
            Type = "Special - Unique",
            Description = "Force a player to answer one Yes/No question truthfully.",
            IsSpecial = true
        });
        cards.Add(new TreacheryCard
        {
            Id = id++,
            Name = "Truthtrance #2",
            Type = "Special - Unique",
            Description = "Force a player to answer one Yes/No question truthfully.",
            IsSpecial = true
        });

        // Karama x2
        cards.Add(new TreacheryCard
        {
            Id = id++,
            Name = "Karama #1",
            Type = "Special - Unique",
            Description = "Use to activate special faction ability or cancel an opponent's advantage.",
            IsSpecial = true
        });
        cards.Add(new TreacheryCard
        {
            Id = id++,
            Name = "Karama #2",
            Type = "Special - Unique",
            Description = "Use to activate special faction ability or cancel an opponent's advantage.",
            IsSpecial = true
        });

        // Cheap Hero x3
        for (int i = 1; i <= 3; i++)
        {
            cards.Add(new TreacheryCard
            {
                Id = id++,
                Name = $"Cheap Hero #{i}",
                Type = "Special - Unique",
                Description = "Play in battle as a leader with 0 strength. Discard after use.",
                IsSpecial = true
            });
        }

        return cards;
    }

    /// <summary>
    /// Verifies that all required card types exist in the database.
    /// Throws an exception if any critical cards are missing.
    /// </summary>
    /// <param name="context">The DuneDbContext to validate</param>
    public static void VerifyRequiredCards(this DuneDbContext context)
    {
        var requiredCardTypes = new[]
        {
            "Weapon - Projectile",
            "Weapon - Poison",
            "Weapon - Lasgun",
            "Defense - Projectile",
            "Defense - Poison"
        };

        foreach (var cardType in requiredCardTypes)
        {
            if (!context.TreacheryCards.Any(c => c.Type == cardType))
            {
                throw new InvalidOperationException(
                    $"Missing required card type: {cardType}. " +
                    $"Please ensure SeedTreacheryCards() has been called with complete card data.");
            }
        }

        // Verify specific critical card (Lasgun)
        if (!context.TreacheryCards.Any(c => c.Name == "Lasgun"))
        {
            throw new InvalidOperationException(
                "Missing critical card: Lasgun. This card is required for atomic explosion mechanic.");
        }
    }
}
