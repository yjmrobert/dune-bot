import { PhaseHandler } from "./PhaseHandler";
import { GameState, GameAction } from "../../types";
import { MentatPauseEngine } from "../MentatPauseEngine";

export class MentatPausePhaseHandler implements PhaseHandler {
    constructor(private engine: MentatPauseEngine) { }

    getAvailableActions(state: GameState): GameAction[] {
        return ["NEXT_PHASE"];
    }
}
