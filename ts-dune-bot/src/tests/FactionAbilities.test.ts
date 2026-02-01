import { describe, it, expect, beforeEach, vi } from "vitest";
import { ShipmentMovementEngine } from "../engine/ShipmentMovementEngine";
import { GameState, Faction } from "../types";
import { BOARD_MAP } from "../constants/map"; // We'll need to mock or use real map
import { BoardService } from "../services/BoardService";

// Mock BOARD_MAP if needed, or rely on real one if available and consistent
// If BOARD_MAP is imported, we assume it has data. 
// We need "Great Flat" to test Fremen shipment.

const mockState = (): GameState => ({
    factions: [
        { 
            faction: Faction.Fremen, 
            playerDiscordId: "fremen", 
            playerName: "Fremen", 
            spice: 10, 
            reserves: 10,
            forcesInTanks: 0,
            leaders: [],
            traitors: [],
            hand: []
        },
        { 
            faction: Faction.Guild, 
            playerDiscordId: "guild", 
            playerName: "Guild", 
            spice: 10, 
            reserves: 10,
            forcesInTanks: 0,
            leaders: [],
            traitors: [],
            hand: []
        },
        { 
            faction: Faction.Atreides, 
            playerDiscordId: "atreides", 
            playerName: "Atreides", 
            spice: 10, 
            reserves: 10,
            forcesInTanks: 0,
            leaders: [],
            traitors: [],
            hand: []
        }
    ],
    boardState: {
        "Arrakeen": { name: "Arrakeen", spice: 0, forces: {} },
        "Carthag": { name: "Carthag", spice: 0, forces: {} },
        "Great Flat": { name: "Great Flat", spice: 0, forces: {} },
        "Imperial Basin": { name: "Imperial Basin", spice: 0, forces: {} }
    },
    stormLocation: 0,
    actionLog: [],
    turn: 1,
    phase: "Movement",
    wizardState: {},
    auctionQueue: [],
    currentBid: 0,
    isBiddingRoundActive: false,
    spiceDeck: [],
    spiceDiscard: [],
    treacheryDeck: [],
    treacheryDiscard: [],
    nexusActive: false,
    readyPlayerIds: []
} as any);

// Mock the map constants
vi.mock("../constants/map", () => ({
    BOARD_MAP: {
        "Arrakeen": { 
            name: "Arrakeen", 
            isStronghold: true, 
            sectors: [{ sector: 1 }],
            neighbors: ["Imperial Basin"]
        },
        "Great Flat": { 
            name: "Great Flat", 
            isStronghold: false, 
            sectors: [{ sector: 1 }],
            neighbors: []
            sectors: { 8: { spice: 0, forceAnchor: [0,0], spiceCoord: [0,0] } },
            neighbors: ["Hagga Basin", "Tuek's Sietch"]
        },
        "Carthag": {
            name: "Carthag",
            isStronghold: true,
            sectors: { 10: { spice: 0, forceAnchor: [0,0], spiceCoord: [0,0] } },
            neighbors: ["Imperial Basin", "Arrakeen", "Hagga Basin"]
        },
        "Imperial Basin": {
            name: "Imperial Basin",
            isStronghold: false,
            sectors: { 
                9: { spice: 0, forceAnchor: [0,0], spiceCoord: [0,0] }, 
                10: { spice: 0, forceAnchor: [0,0], spiceCoord: [0,0] }
            },
            neighbors: ["Arrakeen", "Hagga Basin"]
        },
        "Tsimpo": {
            name: "Tsimpo",
            isStronghold: false,
            sectors: [{ sector: 1 }],
            neighbors: ["Imperial Basin"]
        }
    }
}));

describe("ShipmentMovementEngine - Faction Abilities", () => {
    let engine: ShipmentMovementEngine;

    beforeEach(() => {
        engine = new ShipmentMovementEngine();
        // Mock getDistance to avoid full BFS on real map if we can, 
        // OR rely on real map if integration test. Real map is better if stable.
        // Assuming BOARD_MAP is available.
    });

    // Helper for Voice test
    const createMockState = (playerIds: string[]) => {
        const state = mockState();
        state.factions = playerIds.map(id => ({
            faction: "Atreides", // Default, will override
            playerDiscordId: id,
            playerName: id,
            hand: [],
            treacheryCards: [],
            spice: 0,
            forcesLost: 0,
            leaders: [],
            traitors: [],
            reserves: 0,
            forces: {}
        } as any));
        return state;
    };

    it("should enforce Bene Gesserit Voice", () => {
        const bgId = "player-bg";
        const emId = "player-em";
        const state = createMockState([bgId, emId]);
        const bg = state.factions.find((f: any) => f.playerDiscordId === bgId)!;
        const em = state.factions.find((f: any) => f.playerDiscordId === emId)!;
        
        bg.faction = Faction.BeneGesserit;
        em.faction = Faction.Emperor;
        
        bg.hand = [];
        em.hand = [
            { name: "Crysknife", isWeapon: true, isDefense: false, description: "Weapon", id: "1", type: "Treachery" },
            { name: "Shield", isWeapon: false, isDefense: true, description: "Defense", id: "2", type: "Treachery" }
        ];
        em.leaders = [{ name: "Bashar", strength: 2, isDead: false, isTraitor: false }];

        // Setup Battle
        state.battleState = {
            territory: "Arrakeen",
            aggressorId: bgId,
            defenderId: emId,
            plans: {},
            resolved: false
        };

        const battleEngine = new BattleEngine();

        // 1. BG uses Voice: CANNOT WEAPON
        battleEngine.setVoice(state, bgId, "CANNOT", "WEAPON");
        
        // 2. Emperor tries to use Weapon -> Fail
        expect(() => {
            battleEngine.submitBattlePlan(state, emId, {
                leaderName: "Bashar",
                dial: 1,
                weaponName: "Crysknife"
            });
        }).toThrow("Voice: You CANNOT play a Weapon.");

        // 3. Emperor submits valid plan (no weapon)
        battleEngine.submitBattlePlan(state, emId, {
            leaderName: "Bashar",
            dial: 1,
            defenseName: "Shield"
        });
        
        expect(state.battleState.plans[emId]).toBeDefined();

        // 4. Reset Plans, Voice MUST DEFENSE
        state.battleState.plans = {};
        state.battleState.voice = undefined; 
        
        battleEngine.setVoice(state, bgId, "MUST", "DEFENSE");
        
        // 5. Emperor tries to submit NO defense -> Fail (has shield)
        expect(() => {
             battleEngine.submitBattlePlan(state, emId, {
                leaderName: "Bashar",
                dial: 1
            });
        }).toThrow("Voice: You MUST play a Defense.");
        
        // 6. Emperor submits Defense -> OK
        battleEngine.submitBattlePlan(state, emId, {
             leaderName: "Bashar",
             dial: 1,
             defenseName: "Shield"
        });
        
        expect(state.battleState.plans[emId]).toBeDefined();
    });

    it("Fremen should ship to Great Flat for free", () => {
        const state = mockState();
        const fremen = state.factions.find(f => f.faction === Faction.Fremen)!;
        
        // Ship 5 forces to Great Flat (Sector 1? Assume valid sector)
        // Great Flat usually has sectors. Let's use valid sector from Map if possible.
        // Or assume sector 1 is valid for test if engine checks map.
        // Engine checks: territoryData.sectors.some(s => s.sector === sector)
        
        // We'll mock map lookup if simplest, or pick valid sector.
        // Assume Great Flat has sector 10.
        
        // Force engine to pass map check by mocking it or using known valid:
        // Let's rely on logic flow: 
        // Validates Map -> Checks Cost -> Checks Spice.
        
        // Assuming "Great Flat" exists in map.
        // If map check fails, test fails early.
        
        // 1. Ship 2 forces. Cost normally 4 (2*2). Fremen -> 0.
        engine.shipForces(state, "fremen", "Great Flat", 8, 2); // Sector 8? Check map.
        
        expect(fremen.spice).toBe(10); // No change
        expect(fremen.reserves).toBe(8);
    });

    it("Fremen should move 2 territories without ornithopters", () => {
        const state = mockState();
        const fremenId = "fremen";
        
        // Place forces in Arrakeen
        BoardService.addForce(state, "Arrakeen", 10, Faction.Fremen, 5);
        
        // Move Arrakeen -> Imperial Basin -> Holes? Or Arrakeen -> Imperial Basin -> ...
        // Need a 2-step path.
        // Arrakeen -> Imperial Basin (1 step).
        // Arrakeen -> Imperial Basin -> Habbanya Ridge Flat?
        // Let's assume Distance(Arrakeen, Tsimpo) = 2.
        
        // Mock getDistance for this test to isolate ability logic
        vi.spyOn(engine as any, "getDistance").mockReturnValue(2);
        vi.spyOn(engine as any, "canReach").mockReturnValue(true);
        vi.spyOn(engine as any, "checkOrnithopters").mockReturnValue(false); 
        
        engine.moveForces(state, fremenId, "Arrakeen", "Tsimpo", 1);
        
        expect(state.actionLog.slice(-1)[0]).toContain("moved 1 forces");
    });

    it("Normal faction cannot move 2 territories without ornithopters", () => {
        const state = mockState();
        const atrId = "atreides";
        BoardService.addForce(state, "Arrakeen", 10, Faction.Atreides, 5);
        
        vi.spyOn(engine as any, "getDistance").mockReturnValue(2);
        vi.spyOn(engine as any, "canReach").mockReturnValue(true);
        vi.spyOn(engine as any, "checkOrnithopters").mockReturnValue(false); 
        
        expect(() => engine.moveForces(state, atrId, "Arrakeen", "Tsimpo", 1)).toThrow(/Target is too far/);
    });

    it("Guild should pay half for shipment", () => {
        const state = mockState();
        const guild = state.factions.find(f => f.faction === Faction.Guild)!;
        
        // Ship 3 forces to Arrakeen (Stronghold, Cost 1 each -> 3 total).
        // Guild pays ceil(3/2) = 2? Or 1? 
        // Implementation said Math.ceil(Total / 2).
        // 3 * 1 = 3. / 2 = 1.5 -> 2.
        
        engine.shipForces(state, "guild", "Arrakeen", 10, 3);
        
        expect(guild.spice).toBe(8); // 10 - 2
    });
});
