import { PhaseHandler } from "./PhaseHandler";
import { GameState, GameAction } from "../../types";

export class ChoamCharityPhaseHandler implements PhaseHandler {
    getAvailableActions(state: GameState): GameAction[] {
        return ["NEXT_PHASE"];
    }
}
