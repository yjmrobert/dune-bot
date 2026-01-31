import { PhaseHandler } from "./PhaseHandler";
import { GameState, GameAction } from "../../types";
import { BattleEngine } from "../BattleEngine";

export class BattlePhaseHandler implements PhaseHandler {
    constructor(private engine: BattleEngine) { }

    getAvailableActions(state: GameState): GameAction[] {
        if (state.battleState && !state.battleState.resolved) {
            return ["SUBMIT_PLAN", "REVEAL_PLAN", "TRAITOR", "PLAYER_ACTIONS", "NEXT_PHASE"];
        }
        return ["ATTACK", "RESOLVE_BATTLES", "PLAYER_ACTIONS", "NEXT_PHASE"];
    }
}
