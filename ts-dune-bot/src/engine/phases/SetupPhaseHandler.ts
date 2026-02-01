import { PhaseHandler } from "./PhaseHandler";
import { GameState, GameAction } from "../../types";

export class SetupPhaseHandler implements PhaseHandler {
    getAvailableActions(state: GameState): GameAction[] {
        if (state.phase === "Setup_TraitorPick") {
            return ["PICK_TRAITOR", "PLAYER_ACTIONS"]; 
        }
        if (state.phase === "Setup_Forces") {
             return ["SETUP_FORCES", "PLAYER_ACTIONS"];
        }
        return ["START_GAME", "JOIN_GAME"];
    }
}
