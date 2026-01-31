
import { GameState, Faction, FactionState, TreacheryCard } from "../types";
import { FACTION_LEADERS } from "../constants/leaders";

export class ScenarioRunner {
    private state: GameState;

    constructor() {
        this.state = this.createEmptyState();
    }

    private createEmptyState(): GameState {
        return {
            phase: "Setup",
            turn: 1,
            stormLocation: 0,
            factions: [],
            actionLog: [],
            auctionQueue: [],
            currentBid: 0,
            isBiddingRoundActive: false,
            spiceDeck: [],
            spiceDiscard: [],
            treacheryDeck: [],
            treacheryDiscard: [],
            nexusActive: false,
            boardState: {}
        };
    }

    public withPhase(phase: string) {
        this.state.phase = phase;
        return this;
    }

    public withFaction(faction: Faction, playerName: string = "Player", spice: number = 10) {
        const id = (this.state.factions.length + 1).toString();
        const newFaction: FactionState = {
            faction: faction,
            playerDiscordId: id,
            playerName: playerName,
            spice: spice,
            reserves: 0,
            forcesInTanks: 0,
            leaders: FACTION_LEADERS[faction].map(l => ({ ...l, isDead: false })),
            traitors: [],
            hand: []
        };
        this.state.factions.push(newFaction);
        return this;
    }

    public withForcesInTerritory(faction: Faction, territory: string, sector: number, count: number) {
        if (!this.state.boardState[territory]) {
            this.state.boardState[territory] = { name: territory, spice: 0, forces: {} };
        }
        const t = this.state.boardState[territory];
        if (!t.forces[sector]) t.forces[sector] = {};
        t.forces[sector][faction] = count;
        return this;
    }

    public withReserves(faction: Faction, count: number) {
        const f = this.state.factions.find(f => f.faction === faction);
        if (f) {
            f.reserves = count;
        }
        return this;
    }

    public withCard(faction: Faction, cardName: string, type: "Weapon" | "Defense" | "Useless" = "Useless") {
        const f = this.state.factions.find(f => f.faction === faction);
        if (f) {
            f.hand.push({
                id: Math.random(),
                name: cardName,
                type: "Treachery",
                description: "Mock Card",
                isWeapon: type === "Weapon",
                isDefense: type === "Defense",
                isSpecial: false
            });
        }
        return this;
    }

    public withTraitor(holdingFaction: Faction, traitorOriginalFaction: Faction, leaderName: string) {
        const holder = this.state.factions.find(f => f.faction === holdingFaction);
        if (holder) {
            holder.traitors.push(leaderName);
        }
        return this;
    }

    public withStorm(sector: number) {
        this.state.stormLocation = sector;
        return this;
    }

    public build(): GameState {
        return JSON.parse(JSON.stringify(this.state)); // Deep copy
    }

    // Helper to get ID for tests
    public getFactionId(faction: Faction): string {
        return this.state.factions.find(f => f.faction === faction)?.playerDiscordId || "";
    }
}
