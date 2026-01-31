import { PhaseHandler } from "./PhaseHandler";
import { GameState, GameAction } from "../../types";

export class StormPhaseHandler implements PhaseHandler {
    getAvailableActions(state: GameState): GameAction[] {
        return ["MOVE_STORM", "PLAYER_ACTIONS", "NEXT_PHASE"];
    }
}
