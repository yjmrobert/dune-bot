namespace DuneBot.Domain;

/// <summary>
/// Represents a Treachery Card in the Dune game.
/// Cards can be weapons, defenses, or special cards.
/// </summary>
public class TreacheryCard
{
    /// <summary>
    /// Unique identifier for the card
    /// </summary>
    public int Id { get; set; }

    /// <summary>
    /// Name of the card (e.g., "Lasgun", "Shield", "Poison Blade")
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Type of card using format: "Category - Subtype"
    /// Examples: "Weapon - Projectile", "Weapon - Poison", "Defense - Shield", "Defense - Snooper"
    /// </summary>
    public string Type { get; set; } = string.Empty;

    /// <summary>
    /// Detailed description of the card's effect
    /// </summary>
    public string Description { get; set; } = string.Empty;

    /// <summary>
    /// Whether this card can be used as a weapon in battle
    /// </summary>
    public bool IsWeapon { get; set; }

    /// <summary>
    /// Whether this card can be used as a defense in battle
    /// </summary>
    public bool IsDefense { get; set; }

    /// <summary>
    /// Whether this is a special/worthless card
    /// </summary>
    public bool IsSpecial { get; set; }

    // Helper properties for common card type checks
    public bool IsPoison => Type?.Contains("Poison", StringComparison.OrdinalIgnoreCase) == true;
    public bool IsLasgun => Type?.Contains("Lasgun", StringComparison.OrdinalIgnoreCase) == true;
    public bool IsProjectileDefense => Type == "Defense - Projectile";
    public bool IsPoisonDefense => Type == "Defense - Poison";
}
