import { PhaseHandler } from "./PhaseHandler";
import { GameState, GameAction } from "../../types";

export class NexusPhaseHandler implements PhaseHandler {
    getAvailableActions(state: GameState): GameAction[] {
        // Barrier Pattern: Players must ready up.
        // Once everyone is ready, NextPhase is available (or auto-advance?)
        // Spec says: [Ready], [Next Phase] (Disabled until ready?)
        // If we adhere to "Available Actions", we return keys that map to buttons.
        // Logic in Presenter handles 'disabled' state usually, OR we only return NEXT_PHASE when barrier met?
        // Presenter logic:
        /*
            case "NEXT_PHASE":
                // buttons.push...
        */
        // If we want [Ready] button, we return "TOGGLE_READY".
        // Use "TOGGLE_READY" and "NEXT_PHASE".
        // The command logic prevents premature advance.
        
        return ["TOGGLE_READY", "PLAYER_ACTIONS", "NEXT_PHASE"];
    }
}
