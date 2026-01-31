import { describe, it, expect, beforeEach } from "vitest";
import { GameEngine } from "../engine/GameEngine";
import { GameState, Faction, SpiceCard } from "../types";

describe("Spice Blow Button Integration", () => {
    let gameEngine: GameEngine;
    let mockState: GameState;

    beforeEach(() => {
        gameEngine = new GameEngine();
        mockState = {
            phase: "Spice Blow",
            turn: 2,
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
            boardState: {},
            spiceBlowRevealed: false
        };
    });

    it("should create spice at target territory", () => {
        const card: SpiceCard = {
            id: 1,
            name: "The Great Flat",
            type: "Territory",
            amount: 10,
            sector: 8
        };
        mockState.spiceDeck = [card];

        gameEngine.revealSpiceBlow(mockState);

        expect(mockState.boardState["The Great Flat"].spice).toBe(10);
        expect(mockState.spiceBlowRevealed).toBe(true);
    });

    it("should trigger nexus after turn 1 when worm appears", () => {
        const worm: SpiceCard = { id: 1, name: "Shai-Hulud", type: "Shai-Hulud" };
        const territory: SpiceCard = { id: 2, name: "The Great Flat", type: "Territory", amount: 10 };
        mockState.spiceDeck = [worm, territory];
        mockState.turn = 2;

        gameEngine.revealSpiceBlow(mockState);

        expect(mockState.nexusActive).toBe(true);
        expect(mockState.spiceBlowRevealed).toBe(true);
    });

    it("should NOT trigger nexus on turn 1", () => {
        const worm: SpiceCard = { id: 1, name: "Shai-Hulud", type: "Shai-Hulud" };
        const territory: SpiceCard = { id: 2, name: "The Great Flat", type: "Territory", amount: 10 };
        mockState.spiceDeck = [worm, territory];
        mockState.turn = 1;

        gameEngine.revealSpiceBlow(mockState);

        expect(mockState.nexusActive).toBe(false);
        expect(mockState.spiceBlowRevealed).toBe(true);
        // Worm should be back in deck
        expect(mockState.spiceDeck.some(c => c.name === "Shai-Hulud")).toBe(true);
    });

    it("should ignore worm on turn 1 and protect forces", () => {
        const worm: SpiceCard = { id: 1, name: "Shai-Hulud", type: "Shai-Hulud" };
        const territory: SpiceCard = { id: 2, name: "The Great Flat", type: "Territory", amount: 10 };
        mockState.spiceDeck = [worm, territory];
        mockState.turn = 1;

        // Setup territory with spice and forces
        mockState.boardState["Cielago Depression"] = {
            name: "Cielago Depression",
            spice: 5,
            forces: { 0: { "Atreides": 3 } }
        };
        mockState.spiceDiscard.push({
            id: 3,
            name: "Cielago Depression",
            type: "Territory",
            amount: 10
        });

        gameEngine.revealSpiceBlow(mockState);

        // Forces and spice should remain intact
        expect(mockState.boardState["Cielago Depression"].spice).toBe(5);
        expect(mockState.boardState["Cielago Depression"].forces[0]["Atreides"]).toBe(3);
        // Worm should be set aside and reshuffled
        expect(mockState.spiceDeck.some(c => c.name === "Shai-Hulud")).toBe(true);
    });

    // Note: Storm obstruction is tested in BDD tests with proper BOARD_MAP setup

    it("should set spiceBlowRevealed flag", () => {
        const card: SpiceCard = {
            id: 1,
            name: "The Great Flat",
            type: "Territory",
            amount: 10
        };
        mockState.spiceDeck = [card];

        expect(mockState.spiceBlowRevealed).toBe(false);
        gameEngine.revealSpiceBlow(mockState);
        expect(mockState.spiceBlowRevealed).toBe(true);
    });

    it("should handle multiple worms on turn 1", () => {
        const worm1: SpiceCard = { id: 1, name: "Shai-Hulud", type: "Shai-Hulud" };
        const worm2: SpiceCard = { id: 2, name: "Shai-Hulud", type: "Shai-Hulud" };
        const territory: SpiceCard = { id: 3, name: "The Great Flat", type: "Territory", amount: 10 };
        mockState.spiceDeck = [worm1, worm2, territory];
        mockState.turn = 1;

        gameEngine.revealSpiceBlow(mockState);

        expect(mockState.nexusActive).toBe(false);
        expect(mockState.boardState["The Great Flat"].spice).toBe(10);
        // After processing: worms are reshuffled back, and the discard has the territory card
        // So deck should have 2 worms, discard should have the territory
        const wormCount = mockState.spiceDeck.filter(c => c.name === "Shai-Hulud").length;
        expect(wormCount).toBe(2);
        expect(mockState.spiceDiscard.some(c => c.name === "The Great Flat")).toBe(true);
    });
});
