import { PhaseHandler } from "./PhaseHandler";
import { GameState, GameAction } from "../../types";

export class SetupPhaseHandler implements PhaseHandler {
    getAvailableActions(state: GameState): GameAction[] {
        return ["START_GAME", "JOIN_GAME"];
    }
}
