
import { describe, beforeEach, test, expect } from "vitest";
import { GameEngine } from "./GameEngine";
import { GameState, Faction } from "../types";

describe("GameEngine Issue Reproduction", () => {
    let engine: GameEngine;
    let state: GameState;

    beforeEach(() => {
        engine = new GameEngine();
        state = {
            phase: "Setup",
            turn: 0,
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
    });

    test("Atreides should have 10 forces in Arrakeen after start", () => {
        // 1. Register Atreides (we verify the random logic works or we forcefully set it)
        // Since registerPlayer assigns random, we need to hack it or mock sample.
        // Instead of using registerPlayer, let's manually push a faction to state.
        state.factions.push({
            faction: Faction.Atreides,
            playerDiscordId: "player1",
            playerName: "Paul",
            spice: 0, // setup should fix this
            reserves: 0, // setup should fix this
            forcesInTanks: 0,
            leaders: [],
            traitors: [],
            hand: []
        });

        // 2. Start Game
        const tCards: any[] = [{ name: "T1" }];
        const sCards: any[] = [{ name: "S1" }];
        engine.startGame(state, tCards, sCards);

        // 3. Check Resources
        const atreides = state.factions.find(f => f.faction === Faction.Atreides)!;
        expect(atreides.spice).toBe(10);
        expect(atreides.reserves).toBe(10);

        // 4. Check Board (The Bug)
        const arrakeen = state.boardState["Arrakeen"];
        expect(arrakeen).toBeDefined();
        // Assuming Arrakeen has sector 1 or so. 
        // We need to check if ANY sector in Arrakeen has forces.
        let totalForces = 0;
        if (arrakeen && arrakeen.forces) {
            Object.values(arrakeen.forces).forEach(sectorForces => {
                totalForces += sectorForces[Faction.Atreides] || 0;
            });
        }
        expect(totalForces).toBe(10);
    });

    test("Harkonnen should have 10 forces in Carthag", () => {
        state.factions.push({
            faction: Faction.Harkonnen,
            playerDiscordId: "player2",
            playerName: "Baron",
            spice: 0,
            reserves: 0,
            forcesInTanks: 0,
            leaders: [],
            traitors: [],
            hand: []
        });

        engine.startGame(state, [], []);

        const hark = state.factions.find(f => f.faction === Faction.Harkonnen)!;
        expect(hark.spice).toBe(10);
        expect(hark.reserves).toBe(10);

        const carthag = state.boardState["Carthag"];
        expect(carthag).toBeDefined();
        let totalForces = 0;
        if (carthag && carthag.forces) {
            Object.values(carthag.forces).forEach(sectorForces => {
                totalForces += sectorForces[Faction.Harkonnen] || 0;
            });
        }
        expect(totalForces).toBe(10);
    });

    test("Fremen should have 10 forces in Sietch Tabr", () => {
        state.factions.push({
            faction: Faction.Fremen,
            playerDiscordId: "player3",
            playerName: "Liet",
            spice: 0,
            reserves: 0,
            forcesInTanks: 0,
            leaders: [],
            traitors: [],
            hand: []
        });

        engine.startGame(state, [], []);

        const fremen = state.factions.find(f => f.faction === Faction.Fremen)!;
        expect(fremen.spice).toBe(3);
        expect(fremen.reserves).toBe(10);

        const tabr = state.boardState["Sietch Tabr"];
        expect(tabr).toBeDefined();
        let totalForces = 0;
        if (tabr && tabr.forces) {
            Object.values(tabr.forces).forEach(sectorForces => {
                totalForces += sectorForces[Faction.Fremen] || 0;
            });
        }
        expect(totalForces).toBe(10);
    });
});
