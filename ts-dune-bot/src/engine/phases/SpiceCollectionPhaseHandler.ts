import { PhaseHandler } from "./PhaseHandler";
import { GameState, GameAction } from "../../types";
import { SpiceCollectionEngine } from "../SpiceCollectionEngine";

export class SpiceCollectionPhaseHandler implements PhaseHandler {
    constructor(private engine: SpiceCollectionEngine) { }

    getAvailableActions(state: GameState): GameAction[] {
        return ["COLLECT_SPICE", "PLAYER_ACTIONS", "NEXT_PHASE"];
    }
}
