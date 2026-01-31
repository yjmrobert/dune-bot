import { PhaseHandler } from "./PhaseHandler";
import { GameState, GameAction } from "../../types";
import { BiddingEngine } from "../BiddingEngine";

export class BiddingPhaseHandler implements PhaseHandler {
    constructor(private engine: BiddingEngine) { }

    getAvailableActions(state: GameState): GameAction[] {
        if (state.isBiddingRoundActive) {
            return ["BID", "PASS"];
        }
        return ["NEXT_PHASE"];
    }
}
