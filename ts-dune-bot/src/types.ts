export enum Faction {
    None = "None",
    Atreides = "Atreides",
    Harkonnen = "Harkonnen",
    Fremen = "Fremen",
    Emperor = "Emperor",
    Guild = "Guild",
    BeneGesserit = "BeneGesserit"
}

export interface TreacheryCard {
    id: number;
    name: string;
    type: string;
    description: string;
    isWeapon: boolean;
    isDefense: boolean;
    isSpecial: boolean;
}

export type GameAction =
    | "NEXT_PHASE"
    | "BID" | "PASS"
    | "REVIVE" | "REVIVE_HERO" | "REVIVE_FORCES"
    | "SHIP" | "MOVE"
    | "ATTACK" | "SUBMIT_PLAN" | "REVEAL_PLAN" | "RESOLVE_BATTLES" | "TRAITOR"
    | "START_GAME" | "JOIN_GAME"
    | "PICK_TRAITOR"
    | "MOVE_STORM"
    | "SPICE_BLOW"
    | "COLLECT_SPICE"
    | "MENTAT_PAUSE"
    | "PLAYER_ACTIONS"
    | "TOGGLE_READY" // Barrier Pattern
    | "WIZARD_STEP" // Wizard Pattern
    | "SETUP_FORCES"; // Force Placement Wizard

export interface SpiceCard {
    id: number;
    name: string;
    type: "Territory" | "Shai-Hulud";
    amount?: number; // Spice Amount (usually 6, 8, 10, 12)
    sector?: number; // For storm check
}

export interface LeaderState {
    name: string;
    strength: number;
    isDead: boolean; // true if in Tleilaxu Tanks
}

export interface FactionState {
    faction: Faction;
    playerDiscordId: string;
    playerName: string;
    spice: number;
    reserves: number;
    forcesInTanks: number;
    leaders: LeaderState[];
    traitors: string[]; // Keeping it simple: list of card names or IDs
    traitorOptions?: string[]; // Temporary holding for dealing 4 cards
    hand: TreacheryCard[];
}

export interface GameState {
    lobbyMessageId?: string;
    phase: string; // e.g. "Setup", "Setup_TraitorPick", "Storm", etc.
    pendingPlayerIds?: string[]; // Legacy Barrier Pattern: Wait for these players
    readyPlayerIds: string[]; // New Barrier Pattern: Positive list of ready players
    turn: number;
    stormLocation: number;
    stormMovedThisTurn?: boolean; // Track if storm has moved this turn
    spiceBlowRevealed?: boolean; // Track if spice blow has been revealed this turn
    factions: FactionState[];
    actionLog: string[];

    // Wizard State (Memento Pattern)
    // Key: `p_{playerId}_{wizardType}` -> Value: Any serializable object
    wizardState: Record<string, any>;

    // Bidding State
    auctionQueue: TreacheryCard[];
    currentCard?: TreacheryCard;
    currentBid: number;
    highBidderId?: string;
    currentBidderId?: string;
    auctionInitialBidderId?: string;
    isBiddingRoundActive: boolean;
    firstPlayerId?: string; // Need to track who is First Player (Storm order)

    // Spice Blow State
    spiceDeck: SpiceCard[];
    spiceDiscard: SpiceCard[];
    treacheryDeck: TreacheryCard[];
    treacheryDiscard: TreacheryCard[];
    nexusActive: boolean;

    // Board State
    boardState: Record<string, TerritoryState>; // Key: Territory Name

    // Battle State
    battleState?: BattleStateData;
    winnerId?: string;
}

export interface BattlePlan {
    leaderName: string;
    weaponName?: string;
    defenseName?: string;
    dial: number;
}

export interface BattleStateData {
    territory: string;
    aggressorId: string;
    defenderId: string;
    plans: Record<string, BattlePlan>;
    resolved: boolean;
    winnerId?: string;
}

export interface TerritoryState {
    name: string;
    spice: number;
    forces: Record<number, Record<string, number>>; // SectorId -> (FactionId -> Count)
}
