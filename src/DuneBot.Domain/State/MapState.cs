using System.Collections.Generic;

namespace DuneBot.Domain.State;

public class MapState
{
    public List<Territory> Territories { get; set; } = new();

    public MapState()
    {
        // Ideally we load this from a static definition or config
    }
}

public class Territory
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public bool IsStronghold { get; set; }
    public bool IsSietch { get; set; } // Fremen spawn
    public int Sector { get; set; } // For storm movement (1-18)
    public int SpiceBlowAmount { get; set; } // Current spice on territory
    
    // Occupants
    public Dictionary<Faction, int> Forces { get; set; } = new();
    public Faction? ControlledBy { get; set; } // For stronghold win condition
}
