import { PhaseHandler } from "./PhaseHandler";
import { GameState, GameAction } from "../../types";

export class StormPhaseHandler implements PhaseHandler {
    getAvailableActions(state: GameState): GameAction[] {
        return ["NEXT_PHASE"];
    }
}
