import { PhaseHandler } from "./PhaseHandler";
import { GameState, GameAction } from "../../types";

export class SpiceBlowPhaseHandler implements PhaseHandler {
    getAvailableActions(state: GameState): GameAction[] {
        return ["SPICE_BLOW", "PLAYER_ACTIONS", "NEXT_PHASE"];
    }
}
