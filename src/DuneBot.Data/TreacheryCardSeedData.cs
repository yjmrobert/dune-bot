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
        // Check if cards already exist
        if (context.TreacheryCards.Any())
        {
            return; // Already seeded
        }

        var cards = GetTreacheryCards();
        context.TreacheryCards.AddRange(cards);
        context.SaveChanges();
    }

    /// <summary>
    /// Returns the complete list of Treachery Cards in the Dune game.
    /// TODO: USER TO FILL IN ACTUAL CARD DETAILS
    /// </summary>
    private static List<TreacheryCard> GetTreacheryCards()
    {
        return new List<TreacheryCard>
        {
            // ==========================================================
            // WEAPONS - PROJECTILE
            // ==========================================================
            new TreacheryCard
            {
                Id = 1,
                Name = "PLACEHOLDER - Projectile Weapon 1",
                Type = "Weapon - Projectile",
                Description = "PLACEHOLDER: Projectile weapon description.",
                IsWeapon = true,
                IsDefense = false,
                IsSpecial = false
            },

            // ==========================================================
            // WEAPONS - POISON
            // ==========================================================
            new TreacheryCard
            {
                Id = 2,
                Name = "PLACEHOLDER - Poison Weapon 1",
                Type = "Weapon - Poison",
                Description = "PLACEHOLDER: Poison weapon description.",
                IsWeapon = true,
                IsDefense = false,
                IsSpecial = false
            },

            // ==========================================================
            // WEAPONS - LASGUN
            // ==========================================================
            new TreacheryCard
            {
                Id = 3,
                Name = "Lasgun",
                Type = "Weapon - Lasgun",
                Description = "Energy weapon. Creates atomic explosion when used against Projectile Defense.",
                IsWeapon = true,
                IsDefense = false,
                IsSpecial = false
            },

            // ==========================================================
            // DEFENSES - PROJECTILE
            // ==========================================================
            new TreacheryCard
            {
                Id = 4,
                Name = "PLACEHOLDER - Projectile Defense 1",
                Type = "Defense - Projectile",
                Description = "PLACEHOLDER: Protects against projectile weapons. Creates atomic explosion with Lasgun.",
                IsWeapon = false,
                IsDefense = true,
                IsSpecial = false
            },

            // ==========================================================
            // DEFENSES - POISON
            // ==========================================================
            new TreacheryCard
            {
                Id = 5,
                Name = "PLACEHOLDER - Poison Defense 1",
                Type = "Defense - Poison",
                Description = "PLACEHOLDER: Protects against poison weapons.",
                IsWeapon = false,
                IsDefense = true,
                IsSpecial = false
            },

            // ==========================================================
            // SPECIAL CARDS
            // ==========================================================
            new TreacheryCard
            {
                Id = 6,
                Name = "PLACEHOLDER - Worthless Card 1",
                Type = "Special - Worthless",
                Description = "PLACEHOLDER: Worthless card with no effect.",
                IsWeapon = false,
                IsDefense = false,
                IsSpecial = true
            },

            // ==========================================================
            // TODO: USER TO ADD MORE CARDS HERE
            // 
            // WEAPON CATEGORIES:
            // - "Weapon - Projectile"
            // - "Weapon - Poison"  
            // - "Weapon - Lasgun"
            //
            // DEFENSE CATEGORIES:
            // - "Defense - Projectile"
            // - "Defense - Poison"
            //
            // SPECIAL:
            // - "Special - Worthless"
            // - "Special - [Other]"
            // ==========================================================
        };
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
