import { GameState, FactionState, TerritoryState } from "../types";

export class SpiceCollectionEngine {
    resolveCollection(state: GameState): string[] {
        const logs: string[] = [];
        logs.push("Starting Spice Collection...");

        // 1. Identify who controls Arrakeen/Carthag for Bonus
        // Control = Only faction with forces present?
        // Simplified: Yes. Coexistence not yet implemented.
        const arrakeenOwner = this.getController(state, "Arrakeen");
        const carthagOwner = this.getController(state, "Carthag");

        const bonusFactions = new Set<string>();
        if (arrakeenOwner) bonusFactions.add(arrakeenOwner);
        if (carthagOwner) bonusFactions.add(carthagOwner);

        // 2. Iterate Board
        for (const tName in state.boardState) {
            const territory = state.boardState[tName];
            if (territory.spice <= 0) continue;

            const forces = territory.forces;
            for (const factionId in forces) {
                const count = forces[factionId];
                if (count <= 0) continue;

                const faction = state.factions.find(f => f.faction === factionId);
                if (!faction) continue;

                const rate = bonusFactions.has(factionId) ? 3 : 2;
                const potential = count * rate;
                
                // Cap at available spice
                const collected = Math.min(potential, territory.spice);

                if (collected > 0) {
                    faction.spice += collected;
                    territory.spice -= collected;
                    logs.push(`${factionId} collected ${collected} spice from ${tName} (${count} forces @ ${rate}/force).`);
                    
                    if (territory.spice === 0) break; // Should be handled by logic, but safe break
                }
            }
        }

        state.actionLog.push(...logs);
        return logs;
    }

    private getController(state: GameState, territoryName: string): string | null {
        const t = state.boardState[territoryName];
        if (!t) return null;
        
        const occupiers = Object.keys(t.forces).filter(f => t.forces[f] > 0);
        if (occupiers.length === 1) {
            return occupiers[0];
        }
        return null;
    }
}
