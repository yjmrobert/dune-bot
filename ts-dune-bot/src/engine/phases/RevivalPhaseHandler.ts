import { PhaseHandler } from "./PhaseHandler";
import { GameState, GameAction } from "../../types";
import { RevivalEngine } from "../RevivalEngine";

export class RevivalPhaseHandler implements PhaseHandler {
    constructor(private engine: RevivalEngine) { }

    getAvailableActions(state: GameState): GameAction[] {
        return ["REVIVE", "PLAYER_ACTIONS", "NEXT_PHASE"];
    }
}
