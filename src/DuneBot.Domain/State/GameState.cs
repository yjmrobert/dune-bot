using System.Collections.Generic;

namespace DuneBot.Domain.State;

public class GameState
{
    public int Turn { get; set; } = 1;
    public GamePhase Phase { get; set; } = GamePhase.Setup;
    public List<FactionState> Factions { get; set; } = new();
    
    public MapState Map { get; set; } = new();

    // Board state, storm position, spice blows, etc will go here
    // Board state, storm position, spice blows, etc will go here
    public int StormLocation { get; set; } 
    
    // Decks
    public List<string> TreacheryDeck { get; set; } = new();
    public List<string> TreacheryDiscard { get; set; } = new();
    public List<string> SpiceDeck { get; set; } = new();
    public List<string> SpiceDiscard { get; set; } = new();
    public List<string> TraitorDeck { get; set; } = new(); // Used during setup 
    
    // Logs for the renderer to display recent history
    public List<string> ActionLog { get; set; } = new();

    public GameState()
    {
        // Initialize default state
    }
}

public class FactionState
{
    public Faction Faction { get; set; }
    public ulong? PlayerDiscordId { get; set; } // Null if AI or unassigned
    public string PlayerName { get; set; } = string.Empty;
    public int Spice { get; set; }
    public int Reserves { get; set; } // Troops in reserve
    public List<string> TreacheryCards { get; set; } = new();
    public List<string> Traitors { get; set; } = new();
    public bool HasPassed { get; set; } // Track pass status for phases
}
