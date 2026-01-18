# Treachery Card Database Setup

## Overview

This document describes the Treachery Card database schema and setup process.

## Schema

### TreacheryCard Table

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| Id | int | PK | Unique card identifier |
| Name | string(100) | NOT NULL, UNIQUE | Card name (e.g., "Lasgun", "Shield") |
| Type | string(50) | NOT NULL, INDEXED | Card type using "Category - Subtype" format |
| Description | string(500) | NULL | Card effect description |
| IsWeapon | bool | NOT NULL | Can be used as a weapon |
| IsDefense | bool | NOT NULL | Can be used as a defense |
| IsSpecial | bool | NOT NULL | Is a special/worthless card |

### Card Type Format

**Format**: `Category - Subtype`

**Examples**:
- `Weapon - Poison` - Poison weapons (backfire on winner)
- `Weapon - Projectile` - Projectile weapons (e.g., Lasgun)
- `Weapon - Melee` - Melee weapons (e.g., Crysknife)
- `Defense - Shield` - Shield defense (explosion with Lasgun)
- `Defense - Snooper` - Snooper defense (protects against poison)
- `Special - Worthless` - Worthless cards

## Migration Commands

### 1. Add EF Core Tools (if not already installed)

```bash
dotnet tool install --global dotnet-ef
# OR update existing
dotnet tool update --global dotnet-ef
```

### 2. Create Initial Migration

From the solution root:

```bash
cd src/DuneBot.Data
dotnet ef migrations add AddTreacheryCards --startup-project ../DuneBot.Host
```

### 3. Apply Migration to Database

```bash
dotnet ef database update --startup-project ../DuneBot.Host
```

### 4. Seed Card Data

In your application startup (e.g., `Program.cs` or `Startup.cs`):

```csharp
using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<DuneDbContext>();
    
    // Apply migrations
    context.Database.Migrate();
    
    // Seed card data
    context.SeedTreacheryCards();
    
    // Verify required cards exist
    context.VerifyRequiredCards();
}
```

## Filling in Card Details

The seed data file `TreacheryCardSeedData.cs` contains PLACEHOLDER entries. To complete the card database:

### 1. Open the seed file

```
src/DuneBot.Data/TreacheryCardSeedData.cs
```

### 2. Replace PLACEHOLDER entries

Find entries like:
```csharp
new TreacheryCard
{
    Id = 1,
    Name = "PLACEHOLDER - Poison Weapon 1",
    Type = "Weapon - Poison",
    Description = "PLACEHOLDER: ...",
    IsWeapon = true,
    IsDefense = false,
    IsSpecial = false
}
```

Replace with actual card data:
```csharp
new TreacheryCard
{
    Id = 1,
    Name = "Poison Blade",
    Type = "Weapon - Poison",
    Description = "Kills target leader. If you win the battle, this weapon also kills your own leader.",
    IsWeapon = true,
    IsDefense = false,
    IsSpecial = false
}
```

### 3. Add More Cards

Add additional cards to the list following the format shown in the TODO section.

### 4. Update IDs

Ensure each card has a unique sequential ID.

### 5. Re-seed (if needed)

```bash
# If you need to clear and re-seed:
dotnet ef database drop --startup-project ../DuneBot.Host
dotnet ef database update --startup-project ../DuneBot.Host
```

## Card Type Guidelines

### Weapon - Poison
- **Mechanic**: Kills target leader AND your own leader if you win
- **Defense**: Snooper protects against poison
- **Examples**: Poison Blade, Poison Dart, Poison Tooth

### Weapon - Projectile  
- **Mechanic**: Standard weapon, kills if no defense
- **Defense**: Shield blocks projectiles
- **Special**: Lasgun + Shield = Atomic Explosion
- **Examples**: Lasgun, Maula Pistol, Stunner

### Weapon - Melee
- **Mechanic**: Standard weapon, kills if no defense
- **Defense**: Shield blocks melee
- **Examples**: Crysknife, Kindjal

### Defense - Shield
- **Mechanic**: Blocks most weapons
- **Special**: Shield + Lasgun = Atomic Explosion
- **Examples**: Shield

### Defense - Snooper
- **Mechanic**: Detects and blocks poison
- **Examples**: Snooper

### Special - Worthless
- **Mechanic**: No effect in battle
- **Examples**: Worthless cards (multiple in game)

## Verification

After seeding, verify cards are correct:

```sql
-- Check all card types
SELECT Type, COUNT(*) as Count
FROM TreacheryCards
GROUP BY Type;

-- Verify critical cards
SELECT * FROM TreacheryCards 
WHERE Name IN ('Lasgun', 'Shield', 'Snooper');

-- Check for placeholders (should return 0)
SELECT COUNT(*) FROM TreacheryCards
WHERE Name LIKE '%PLACEHOLDER%';
```

## Usage in Game Engine

### Loading Cards

```csharp
// Get all poison weapons
var poisonWeapons = await context.TreacheryCards
    .Where(c => c.Type == "Weapon - Poison")
    .ToListAsync();

// Get specific card by name
var lasgun = await context.TreacheryCards
    .FirstOrDefaultAsync(c => c.Name == "Lasgun");

// Check if card is poison
if (card.IsPoison)
{
    // Handle poison backfire logic
}
```

### Battle Logic Integration

```csharp
// In ResolveBattle:
var weaponCard = await context.TreacheryCards
    .FirstOrDefaultAsync(c => c.Name == battlePlan.Weapon);

if (weaponCard != null && weaponCard.IsPoison)
{
    // Apply poison backfire logic
}

if (weaponCard?.IsLasgun == true && defenseCard?.IsShield == true)
{
    // Atomic explosion!
}
```

## Troubleshooting

### Migration failed
- Ensure DuneBot.Host has EF Core references
- Check connection string in appsettings.json
- Verify startup project is set correctly

### Cards not seeding
- Check if `SeedTreacheryCards()` is called during startup
- Verify database exists and connection is valid
- Check for unique constraint violations (duplicate names)

### Verification fails
- Ensure all PLACEHOLDER entries have been replaced
- Verify Lasgun, Shield, and Snooper cards exist with exact name matches
- Check that at least one card exists for each required type
