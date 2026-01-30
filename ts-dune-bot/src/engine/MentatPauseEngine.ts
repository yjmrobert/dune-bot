import { GameState } from "../types";
import { BOARD_MAP } from "../constants/map";

export class MentatPauseEngine {
    resolveMentatPause(state: GameState): string[] {
        const logs: string[] = [];
        logs.push("Mentat Pause...");

        // 1. Check Win Conditions
        const strongholdCounts = new Map<string, number>();

        for (const tName in state.boardState) {
            const t = BOARD_MAP[tName];
            if (!t || !t.isStronghold) continue;

            const controller = this.getController(state, tName);
            if (controller) {
                const current = strongholdCounts.get(controller) || 0;
                strongholdCounts.set(controller, current + 1);
            }
        }

        // Standard rules: 3 strongholds to win
        // (Ignoring Alliance/Guild/Fremen special rules for MVP)
        for (const [factionId, count] of strongholdCounts.entries()) {
            if (count >= 3) {
                state.winnerId = factionId;
                logs.push(`WINNER: ${factionId} controls ${count} strongholds!`);
                return logs;
            }
        }

        // 2. Check Turn Limit
        if (state.turn >= 10) {
            logs.push("Turn 10 reached without a winner. Game Over.");
            // We can mark some 'terminated' state?
            // For now, let's just not advance phase? Or set a specific flag.
            // Let's use winnerId as "None" or similar if we want to signal end?
            // Or just leave phase as "Mentat Pause" forever.
            state.phase = "Game Over"; 
            return logs;
        }

        // 3. Advance Turn
        state.turn += 1;
        state.phase = "Storm";
        // Reset flags
        for (const f of state.factions) {
            // Reset flags if we had any (e.g. hasShipped, hasMoved)
            // (These are currently tracked in action logs or not persisted on faction state explicitly yet?)
            // ShipmentEngine uses simple validation. 
            // Ideally we clear 'hasShipped', 'hasMoved' boolean flags if we added them to FactionState.
            // Looking at FactionState type... checked earlier.
        }
        
        logs.push(`Advancing to Turn ${state.turn}, Storm Phase.`);
        return logs;
    }

    private getController(state: GameState, territoryName: string): string | null {
        const t = state.boardState[territoryName];
        if (!t) return null;
        
        const occupiers = Object.keys(t.forces).filter(f => t.forces[f] > 0);
        if (occupiers.length === 1) {
            return occupiers[0]; // Sole occupier controls
        }
        return null;
    }
}
