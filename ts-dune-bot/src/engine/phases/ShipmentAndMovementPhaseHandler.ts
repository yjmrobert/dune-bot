import { PhaseHandler } from "./PhaseHandler";
import { GameState, GameAction } from "../../types";
import { ShipmentMovementEngine } from "../ShipmentMovementEngine";

export class ShipmentAndMovementPhaseHandler implements PhaseHandler {
    constructor(private engine: ShipmentMovementEngine) { }

    getAvailableActions(state: GameState): GameAction[] {
        return ["SHIP", "MOVE", "PLAYER_ACTIONS", "NEXT_PHASE"];
    }
}
