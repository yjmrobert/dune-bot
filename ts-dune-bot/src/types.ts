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

export type GameAction = "NEXT_PHASE" | "BID" | "PASS" | "REVIVE" | "SHIP" | "MOVE" | "ATTACK" | "SUBMIT_PLAN" | "TRAITOR" | "START_GAME" | "JOIN_GAME" | "RESOLVE_BATTLES";

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
    hand: TreacheryCard[];
}

export interface GameState {
    lobbyMessageId?: string;
    phase: string;
    turn: number;
    stormLocation: number;
    factions: FactionState[];
    actionLog: string[];

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
