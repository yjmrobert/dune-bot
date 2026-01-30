"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpiceCollectionEngine = void 0;
const BoardService_1 = require("../services/BoardService");
class SpiceCollectionEngine {
    resolveCollection(state) {
        const logs = [];
        logs.push("Starting Spice Collection...");
        // 1. Identify who controls Arrakeen/Carthag for Bonus
        // Control = Only faction with forces present?
        // Simplified: Yes. Coexistence not yet implemented.
        const arrakeenOwner = this.getController(state, "Arrakeen");
        const carthagOwner = this.getController(state, "Carthag");
        const bonusFactions = new Set();
        if (arrakeenOwner)
            bonusFactions.add(arrakeenOwner);
        if (carthagOwner)
            bonusFactions.add(carthagOwner);
        // 2. Iterate Board
        for (const tName in state.boardState) {
            const territory = state.boardState[tName];
            if (territory.spice <= 0)
                continue;
            // Aggregate forces by faction
            const factionForces = BoardService_1.BoardService.getForces(state, tName);
            for (const factionId in factionForces) {
                const count = factionForces[factionId];
                if (count <= 0)
                    continue;
                const faction = state.factions.find(f => f.faction === factionId);
                if (!faction)
                    continue;
                const rate = bonusFactions.has(factionId) ? 3 : 2;
                const potential = count * rate;
                // Cap at available spice
                const collected = Math.min(potential, territory.spice);
                if (collected > 0) {
                    faction.spice += collected;
                    territory.spice -= collected;
                    logs.push(`${factionId} collected ${collected} spice from ${tName} (${count} forces @ ${rate}/force).`);
                    if (territory.spice === 0)
                        break; // Should be handled by logic, but safe break
                }
            }
        }
        state.actionLog.push(...logs);
        return logs;
    }
    getController(state, territoryName) {
        return BoardService_1.BoardService.getController(state, territoryName);
    }
}
exports.SpiceCollectionEngine = SpiceCollectionEngine;
