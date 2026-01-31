import { describe, it, expect } from "vitest";
import { StormPhaseHandler } from "./StormPhaseHandler";
import { SpiceBlowPhaseHandler } from "./SpiceBlowPhaseHandler";
import { BiddingPhaseHandler } from "./BiddingPhaseHandler";
import { RevivalPhaseHandler } from "./RevivalPhaseHandler";
import { ShipmentAndMovementPhaseHandler } from "./ShipmentAndMovementPhaseHandler";
import { BattlePhaseHandler } from "./BattlePhaseHandler";
import { SpiceCollectionPhaseHandler } from "./SpiceCollectionPhaseHandler";
import { MentatPausePhaseHandler } from "./MentatPausePhaseHandler";
import { GameState } from "../../types";

// Helper to create a minimal game state
function createMockState(overrides?: Partial<GameState>): GameState {
    return {
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
        boardState: {},
        ...overrides
    };
}

describe("Phase Handlers - Available Actions", () => {
    describe("StormPhaseHandler", () => {
        it("should return MOVE_STORM, PLAYER_ACTIONS, and NEXT_PHASE", () => {
            const handler = new StormPhaseHandler();
            const state = createMockState();
            const actions = handler.getAvailableActions(state);

            expect(actions).toEqual(["MOVE_STORM", "PLAYER_ACTIONS", "NEXT_PHASE"]);
        });
    });

    describe("SpiceBlowPhaseHandler", () => {
        it("should return SPICE_BLOW, PLAYER_ACTIONS, and NEXT_PHASE", () => {
            const handler = new SpiceBlowPhaseHandler();
            const state = createMockState();
            const actions = handler.getAvailableActions(state);

            expect(actions).toEqual(["SPICE_BLOW", "PLAYER_ACTIONS", "NEXT_PHASE"]);
        });
    });

    describe("BiddingPhaseHandler", () => {
        it("should return BID, PASS, PLAYER_ACTIONS, and NEXT_PHASE when bidding is active", () => {
            const mockBiddingEngine = {} as any;
            const handler = new BiddingPhaseHandler(mockBiddingEngine);
            const state = createMockState({ isBiddingRoundActive: true });
            const actions = handler.getAvailableActions(state);

            expect(actions).toEqual(["BID", "PASS", "PLAYER_ACTIONS", "NEXT_PHASE"]);
        });

        it("should return only PLAYER_ACTIONS and NEXT_PHASE when bidding is not active", () => {
            const mockBiddingEngine = {} as any;
            const handler = new BiddingPhaseHandler(mockBiddingEngine);
            const state = createMockState({ isBiddingRoundActive: false });
            const actions = handler.getAvailableActions(state);

            expect(actions).toEqual(["PLAYER_ACTIONS", "NEXT_PHASE"]);
        });
    });

    describe("RevivalPhaseHandler", () => {
        it("should return REVIVE, PLAYER_ACTIONS, and NEXT_PHASE", () => {
            const mockRevivalEngine = {} as any;
            const handler = new RevivalPhaseHandler(mockRevivalEngine);
            const state = createMockState();
            const actions = handler.getAvailableActions(state);

            expect(actions).toEqual(["REVIVE", "PLAYER_ACTIONS", "NEXT_PHASE"]);
        });
    });

    describe("ShipmentAndMovementPhaseHandler", () => {
        it("should return SHIP, MOVE, PLAYER_ACTIONS, and NEXT_PHASE", () => {
            const mockShipmentEngine = {} as any;
            const handler = new ShipmentAndMovementPhaseHandler(mockShipmentEngine);
            const state = createMockState();
            const actions = handler.getAvailableActions(state);

            expect(actions).toEqual(["SHIP", "MOVE", "PLAYER_ACTIONS", "NEXT_PHASE"]);
        });
    });

    describe("BattlePhaseHandler", () => {
        it("should return SUBMIT_PLAN, REVEAL_PLAN, TRAITOR, PLAYER_ACTIONS, and NEXT_PHASE when battle is active", () => {
            const mockBattleEngine = {} as any;
            const handler = new BattlePhaseHandler(mockBattleEngine);
            const state = createMockState({
                battleState: {
                    territory: "Arrakeen",
                    aggressorId: "player1",
                    defenderId: "player2",
                    plans: {},
                    resolved: false
                }
            });
            const actions = handler.getAvailableActions(state);

            expect(actions).toEqual(["SUBMIT_PLAN", "REVEAL_PLAN", "TRAITOR", "PLAYER_ACTIONS", "NEXT_PHASE"]);
        });

        it("should return ATTACK, RESOLVE_BATTLES, PLAYER_ACTIONS, and NEXT_PHASE when no active battle", () => {
            const mockBattleEngine = {} as any;
            const handler = new BattlePhaseHandler(mockBattleEngine);
            const state = createMockState();
            const actions = handler.getAvailableActions(state);

            expect(actions).toEqual(["ATTACK", "RESOLVE_BATTLES", "PLAYER_ACTIONS", "NEXT_PHASE"]);
        });
    });

    describe("SpiceCollectionPhaseHandler", () => {
        it("should return COLLECT_SPICE, PLAYER_ACTIONS, and NEXT_PHASE", () => {
            const mockSpiceCollectionEngine = {} as any;
            const handler = new SpiceCollectionPhaseHandler(mockSpiceCollectionEngine);
            const state = createMockState();
            const actions = handler.getAvailableActions(state);

            expect(actions).toEqual(["COLLECT_SPICE", "PLAYER_ACTIONS", "NEXT_PHASE"]);
        });
    });

    describe("MentatPausePhaseHandler", () => {
        it("should return MENTAT_PAUSE, PLAYER_ACTIONS, and NEXT_PHASE", () => {
            const mockMentatEngine = {} as any;
            const handler = new MentatPausePhaseHandler(mockMentatEngine);
            const state = createMockState();
            const actions = handler.getAvailableActions(state);

            expect(actions).toEqual(["MENTAT_PAUSE", "PLAYER_ACTIONS", "NEXT_PHASE"]);
        });
    });
});
