import { describe, it, expect } from "vitest";
import { GameManager } from "../engine/GameManager";
import { GameState, Faction } from "../types";

describe("GameManager - Player Actions", () => {
    describe("getPlayerActions", () => {
        it("should return empty array if player is not in the game", () => {
            const mockDiscordService = {} as any;
            const mockGameEngine = {} as any;
            const gameManager = new GameManager(mockDiscordService, mockGameEngine);

            const state: GameState = {
                phase: "Storm",
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

            const actions = gameManager.getPlayerActions(state, "unknownPlayerId");
            expect(actions).toEqual([]);
        });

        it("should return player status including spice, reserves, and forces", () => {
            const mockDiscordService = {} as any;
            const mockGameEngine = {} as any;
            const gameManager = new GameManager(mockDiscordService, mockGameEngine);

            const state: GameState = {
                phase: "Storm",
                turn: 1,
                stormLocation: 0,
                factions: [{
                    faction: Faction.Atreides,
                    playerDiscordId: "player123",
                    playerName: "TestPlayer",
                    spice: 10,
                    reserves: 20,
                    forcesInTanks: 5,
                    leaders: [],
                    traitors: [],
                    hand: []
                }],
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

            const actions = gameManager.getPlayerActions(state, "player123");
            expect(actions).toContain("Spice: 10");
            expect(actions).toContain("Reserves: 20");
            expect(actions).toContain("Forces in Tanks: 5");
        });

        it("should include treachery cards in hand", () => {
            const mockDiscordService = {} as any;
            const mockGameEngine = {} as any;
            const gameManager = new GameManager(mockDiscordService, mockGameEngine);

            const state: GameState = {
                phase: "Storm",
                turn: 1,
                stormLocation: 0,
                factions: [{
                    faction: Faction.Harkonnen,
                    playerDiscordId: "player456",
                    playerName: "TestPlayer2",
                    spice: 5,
                    reserves: 10,
                    forcesInTanks: 3,
                    leaders: [],
                    traitors: [],
                    hand: [
                        { id: 1, name: "Lasgun", type: "weapon", description: "", isWeapon: true, isDefense: false, isSpecial: false },
                        { id: 2, name: "Shield", type: "defense", description: "", isWeapon: false, isDefense: true, isSpecial: false }
                    ]
                }],
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

            const actions = gameManager.getPlayerActions(state, "player456");
            expect(actions).toContain("Card: Lasgun");
            expect(actions).toContain("Card: Shield");
        });

        it("should include traitor count (masked)", () => {
            const mockDiscordService = {} as any;
            const mockGameEngine = {} as any;
            const gameManager = new GameManager(mockDiscordService, mockGameEngine);

            const state: GameState = {
                phase: "Storm",
                turn: 1,
                stormLocation: 0,
                factions: [{
                    faction: Faction.Fremen,
                    playerDiscordId: "player789",
                    playerName: "TestPlayer3",
                    spice: 15,
                    reserves: 30,
                    forcesInTanks: 8,
                    leaders: [],
                    traitors: ["Leader1", "Leader2"],
                    hand: []
                }],
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

            const actions = gameManager.getPlayerActions(state, "player789");
            expect(actions).toContain("Traitors: 2 known");
        });
    });
});
