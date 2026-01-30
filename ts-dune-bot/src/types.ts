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

export interface SpiceCard {
    id: number;
    name: string;
    type: "Territory" | "Shai-Hulud";
    amount?: number; // Spice Amount (usually 6, 8, 10, 12)
    sector?: number; // For storm check
}

export interface FactionState {
    faction: Faction;
    playerDiscordId: string;
    playerName: string;
    spice: number;
    reserves: number;
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
    nexusActive: boolean;

    // Board State
    boardState: Record<string, TerritoryState>; // Key: Territory Name
}

export interface TerritoryState {
    name: string;
    spice: number;
    forces: Record<string, number>; // FactionId -> Count
}
