using System.Collections.Generic;

namespace DuneBot.Domain.State;

public class GameState
{
    public int Turn { get; set; } = 1;
    public GamePhase Phase { get; set; } = GamePhase.Setup;
    public List<FactionState> Factions { get; set; } = new();
    
    public MapState Map { get; set; } = new();

    // Board state, storm position, spice blows, etc will go here
    public int StormLocation { get; set; } 
    
    public ulong? LobbyMessageId { get; set; }
    public ulong? FirstPlayerId { get; set; }
    
    // Decks
    public List<string> TreacheryDeck { get; set; } = new();
    public List<string> TreacheryDiscard { get; set; } = new();
    public List<string> SpiceDeck { get; set; } = new();
    public List<string> SpiceDiscard { get; set; } = new();
    public List<string> TraitorDeck { get; set; } = new(); // Used during setup 

    // Bidding Phase State
    public string? CurrentCard { get; set; } // The card currently up for auction
    public int CurrentBid { get; set; }
    public ulong? HighBidderId { get; set; }
    public ulong? CurrentBidderId { get; set; } // Whose turn to bid
    public bool IsBiddingRoundActive { get; set; } // True if bidding is in progress 
    public ulong? BiddingThreadId { get; set; } // ID of the specific Discord thread for this auction
    
    // Battle Phase State
    public Queue<BattleState> PendingBattles { get; set; } = new();
    public BattleState? CurrentBattle { get; set; }

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
    public int ForcesInTanks { get; set; } // Dead troops available for revival
    public List<string> TreacheryCards { get; set; } = new();
    public List<string> Traitors { get; set; } = new();
    public List<string> DeadLeaders { get; set; } = new(); // Leaders in the tanks
    public List<string> CapturedLeaders { get; set; } = new(); // Leaders captured by this faction
    public bool HasPassed { get; set; } // Track pass status for phases
    public int RevivedTroopsThisTurn { get; set; } // Reset each turn
    public bool HasShipped { get; set; } // Reset at Ship/Move phase
    public bool HasMoved { get; set; } // Reset at Ship/Move phase
    public int StartSector { get; set; } // The sector where the faction's token is placed (1-18)
}

public class BattleState
{
    public string TerritoryName { get; set; } = string.Empty;
    public ulong Faction1Id { get; set; }
    public ulong Faction2Id { get; set; }
    public bool IsActive { get; set; }
    public Dictionary<ulong, BattlePlan> Plans { get; set; } = new();
    
    // Voice Restriction: "Must play X" or "Must not play X"
    public (ulong TargetId, string Type, bool MustPlay)? VoiceRestriction { get; set; } 
    // Type: "Projectile Weapon", "Poison Defense", etc. MVP: "Weapon", "Defense"

    // Atreides Prescience: "Show me X"
    public (ulong RequesterId, string Type)? PrescienceRequest { get; set; }
    // Type: "Leader", "Weapon", "Defense", "Dial"
}

public class BattlePlan
{
    public string LeaderName { get; set; } = string.Empty;
    public int Dial { get; set; }
    public string? Weapon { get; set; }
    public string? Defense { get; set; }
}
