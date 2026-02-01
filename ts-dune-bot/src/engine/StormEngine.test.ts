import { describe, it, expect, beforeEach } from "vitest";
import { StormEngine } from "./StormEngine";
import { GameState, Faction } from "../types";
import { Territory } from "@prisma/client";

// Mock minimal state
const mockState = (stormLoc: number, factions: Faction[]): GameState => ({
    stormLocation: stormLoc,
    factions: factions.map((f, i) => ({ 
        faction: f, 
        playerDiscordId: f, 
        playerName: f,
        spice: 0,
        reserves: 0,
        forcesInTanks: 0,
        leaders: [],
        traitors: [],
        hand: []
    })),
    actionLog: [],
    turn: 1,
    phase: "Storm",
    wizardState: {},
    auctionQueue: [],
    currentBid: 0,
    isBiddingRoundActive: false,
    spiceDeck: [],
    spiceDiscard: [],
    treacheryDeck: [],
    treacheryDiscard: [],
    nexusActive: false,
    boardState: {},
    readyPlayerIds: []
});

describe("StormEngine", () => {
    let engine: StormEngine;

    beforeEach(() => {
        engine = new StormEngine();
    });

    it("should determine first player correctly based on storm position (Case 1)", () => {
        // Canonical Seats: Guild(1), Emp(4), BG(7), Atr(10), Hark(13), Frem(16)
        // Storm 15.
        // Positions: Atr(10), Hark(13), Frem(16) - assumed from input list order? No, inputs are just playing factions.
        // State has [Atreides, Harkonnen, Fremen]
        
        // Distances from Storm 15 (moving 1->18):
        // Atreides (10): (10-15 = -5) -> 13
        // Harkonnen (13): (13-15 = -2) -> 16
        // Fremen (16): (16-15 = 1) -> 1
        
        // Closest positive distance is Fremen (1).
        
        const state = mockState(15, [Faction.Atreides, Faction.Harkonnen, Faction.Fremen]);
        engine.determineFirstPlayer(state);
        expect(state.firstPlayerId).toBe(Faction.Fremen);
    });

    it("should determine first player correctly based on storm position (Case 2: Wrap Around)", () => {
        // Storm 17.
        // Atreides (10): 10-17=-7 -> 11
        // Harkonnen (13): 13-17=-4 -> 14
        // Fremen (16): 16-17=-1 -> 17
        
        // Wait, wrap logic: (Pos - Storm). If <= 0 add 18.
        // Atr: 10-17 = -7 + 18 = 11.
        // Hark: 13-17 = -4 + 18 = 14.
        // Frem: 16-17 = -1 + 18 = 17.
        
        // Closest is Atreides (11).
        
        const state = mockState(17, [Faction.Atreides, Faction.Harkonnen, Faction.Fremen]);
        engine.determineFirstPlayer(state);
        expect(state.firstPlayerId).toBe(Faction.Atreides);
    });

    it("should determine first player correctly based on storm position (Case 3: Moving away)", () => {
        // Storm 1.
        // Atreides (10): 9
        // Harkonnen (13): 12
        // Fremen (16): 15
        
        // Closest is Atreides (9).
        
        const state = mockState(1, [Faction.Atreides, Faction.Harkonnen, Faction.Fremen]);
        engine.determineFirstPlayer(state);
        expect(state.firstPlayerId).toBe(Faction.Atreides);
    });

    it("should determine first player correctly based on storm position (Case 4: Exact landing)", () => {
        // Storm lands ON 13 (Harkonnen).
        // Atreides (10): 10-13 = -3 + 18 = 15.
        // Harkonnen (13): 0 -> 18.
        // Fremen (16): 16-13 = 3.
        
        // Closest is Fremen (3).
        
        const state = mockState(13, [Faction.Atreides, Faction.Harkonnen, Faction.Fremen]);
        engine.determineFirstPlayer(state);
        expect(state.firstPlayerId).toBe(Faction.Fremen);
    });

    it("should handle mixed custom factions", () => {
        // Guild (1), Emperor (4), BG (7)
        // Storm 2. 
        // Guild (1): 1-2 = -1 -> 17
        // Emperor (4): 4-2 = 2
        // BG (7): 7-2 = 5
        
        // Closest is Emperor (2).
        
        const state = mockState(2, [Faction.Guild, Faction.Emperor, Faction.BeneGesserit]);
        engine.determineFirstPlayer(state);
        expect(state.firstPlayerId).toBe(Faction.Emperor);
    });
});
