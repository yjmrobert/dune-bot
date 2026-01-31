import { GameState, GameAction } from "../../types";

export interface PhaseHandler {
    getAvailableActions(state: GameState): GameAction[];
}
