import { PhaseHandler } from "./PhaseHandler";
import { GameState, GameAction } from "../../types";

export class StormPhaseHandler implements PhaseHandler {
    getAvailableActions(state: GameState): GameAction[] {
        // If storm moved, we allow Next Phase.
        if (state.stormMovedThisTurn) {
             return ["NEXT_PHASE"];
        }
        return ["MOVE_STORM", "PLAYER_ACTIONS"];
    }
}
