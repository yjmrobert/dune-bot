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
            // WEAPONS - POISON
            // ==========================================================
            new TreacheryCard
            {
                Id = 1,
                Name = "PLACEHOLDER - Poison Weapon 1",
                Type = "Weapon - Poison",
                Description = "PLACEHOLDER: Poison weapon description. Kills target leader but may backfire.",
                IsWeapon = true,
                IsDefense = false,
                IsSpecial = false
            },
            new TreacheryCard
            {
                Id = 2,
                Name = "PLACEHOLDER - Poison Weapon 2",
                Type = "Weapon - Poison",
                Description = "PLACEHOLDER: Another poison weapon.",
                IsWeapon = true,
                IsDefense = false,
                IsSpecial = false
            },

            // ==========================================================
            // WEAPONS - PROJECTILE
            // ==========================================================
            new TreacheryCard
            {
                Id = 3,
                Name = "Lasgun",
                Type = "Weapon - Projectile",
                Description = "Energy weapon. Creates atomic explosion when combined with a Shield.",
                IsWeapon = true,
                IsDefense = false,
                IsSpecial = false
            },
            new TreacheryCard
            {
                Id = 4,
                Name = "PLACEHOLDER - Projectile Weapon",
                Type = "Weapon - Projectile",
                Description = "PLACEHOLDER: Standard projectile weapon.",
                IsWeapon = true,
                IsDefense = false,
                IsSpecial = false
            },

            // ==========================================================
            // WEAPONS - MELEE
            // ==========================================================
            new TreacheryCard
            {
                Id = 5,
                Name = "PLACEHOLDER - Crysknife",
                Type = "Weapon - Melee",
                Description = "PLACEHOLDER: Sacred Fremen blade.",
                IsWeapon = true,
                IsDefense = false,
                IsSpecial = false
            },

            // ==========================================================
            // DEFENSES - SHIELD
            // ==========================================================
            new TreacheryCard
            {
                Id = 6,
                Name = "Shield",
                Type = "Defense - Shield",
                Description = "Protective energy field. Creates atomic explosion when hit by Lasgun.",
                IsWeapon = false,
                IsDefense = true,
                IsSpecial = false
            },

            // ==========================================================
            // DEFENSES - SNOOPER
            // ==========================================================
            new TreacheryCard
            {
                Id = 7,
                Name = "Snooper",
                Type = "Defense - Snooper",
                Description = "Poison detector. Protects against poison weapons.",
                IsWeapon = false,
                IsDefense = true,
                IsSpecial = false
            },

            // ==========================================================
            // SPECIAL CARDS
            // ==========================================================
            new TreacheryCard
            {
                Id = 8,
                Name = "PLACEHOLDER - Worthless Card 1",
                Type = "Special - Worthless",
                Description = "PLACEHOLDER: Worthless card with no effect.",
                IsWeapon = false,
                IsDefense = false,
                IsSpecial = true
            },

            // ==========================================================
            // TODO: USER TO ADD MORE CARDS HERE
            // Format for each card type:
            //
            // WEAPON - POISON:
            //   - Name: Specific poison weapon name
            //   - Type: "Weapon - Poison"
            //   - IsWeapon: true
            //
            // WEAPON - PROJECTILE:
            //   - Name: Specific projectile weapon name  
            //   - Type: "Weapon - Projectile"
            //   - IsWeapon: true
            //
            // WEAPON - MELEE:
            //   - Name: Specific melee weapon name
            //   - Type: "Weapon - Melee"
            //   - IsWeapon: true
            //
            // DEFENSE - SHIELD:
            //   - Name: "Shield" (or variant)
            //   - Type: "Defense - Shield"
            //   - IsDefense: true
            //
            // DEFENSE - SNOOPER:
            //   - Name: "Snooper" (or variant)
            //   - Type: "Defense - Snooper"
            //   - IsDefense: true
            //
            // SPECIAL:
            //   - Name: Special card name
            //   - Type: "Special - [Subtype]"
            //   - IsSpecial: true
            //
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
            "Weapon - Poison",
            "Weapon - Projectile",
            "Defense - Shield",
            "Defense - Snooper"
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

        // Verify specific critical cards
        var criticalCards = new[] { "Lasgun", "Shield", "Snooper" };
        foreach (var cardName in criticalCards)
        {
            if (!context.TreacheryCards.Any(c => c.Name == cardName))
            {
                throw new InvalidOperationException(
                    $"Missing critical card: {cardName}. " +
                    $"This card is required for game mechanics.");
            }
        }
    }
}
