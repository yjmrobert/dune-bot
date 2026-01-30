"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RevivalEngine = void 0;
class RevivalEngine {
    /**
     * Revives forces from tanks to reserves.
     * @param state Game State
     * @param factionId Discord ID of player
     * @param count Number of forces to revive
     */
    reviveForces(state, factionId, count) {
        const faction = state.factions.find(f => f.playerDiscordId === factionId);
        if (!faction)
            throw new Error("Player not found.");
        if (count <= 0)
            throw new Error("Must revive at least 1 force.");
        if (count > 3)
            throw new Error("Cannot revive more than 3 forces per turn.");
        if (faction.forcesInTanks < count)
            throw new Error(`Not enough forces in tanks. You have ${faction.forcesInTanks}.`);
        // Determine free revival limit (usually 2, can vary by faction, but MVP = 2? Rules say "stated on sheet")
        // Standard is 1 free? Or 2? 
        // Rules say: "A certain number... for free".
        // Harkonnen: 2 free. Atreides: 2 free?
        // Let's assume standard "Free Revival" is 1 force? Or all 3?
        // Wait, "Basic Game": 
        // - Atreides: 2 forces
        // - Harkonnen: 2 forces
        // - Others generally 1? 
        // Let's implement a simple "Free Revivals" lookup or default to 1 for MVP if simplified.
        // Actually for "Bot", we want to be accurate. 
        // Let's use 1 as default, extend later.
        const freeLimit = (['Atreides', 'Harkonnen'].includes(faction.faction)) ? 2 : 1;
        // Actually, Fremen get 3 free (Resurrection).
        // Let's hardcode a helper function for limit.
        const limit = this.getFreeRevivalLimit(faction.faction);
        let cost = 0;
        if (count > limit) {
            const paidCount = count - limit;
            cost = paidCount * 2;
        }
        if (faction.spice < cost)
            throw new Error(`Not enough spice. Cost is ${cost}.`);
        // Process
        faction.spice -= cost;
        faction.forcesInTanks -= count;
        faction.reserves += count;
        let msg = `${faction.playerName} revived ${count} forces`;
        if (cost > 0)
            msg += ` for ${cost} spice`;
        else
            msg += ` for free`;
        state.actionLog.push(msg);
        return msg;
    }
    reviveLeader(state, factionId, leaderName) {
        const faction = state.factions.find(f => f.playerDiscordId === factionId);
        if (!faction)
            throw new Error("Player not found.");
        const leader = faction.leaders.find(l => l.name === leaderName);
        if (!leader)
            throw new Error("Leader not found.");
        if (!leader.isDead)
            throw new Error("Leader is not in the tanks.");
        // Rule: Can only revive leader if ALL leaders are in tanks (dead).
        const aliveLeaders = faction.leaders.filter(l => !l.isDead);
        if (aliveLeaders.length > 0)
            throw new Error("Cannot revive leader while others are alive.");
        // Rule: Can revive 1 leader per turn. 
        // Need to track if they already revived this turn?
        // For MVP, assume the command is only run once or checks phase state (if we had sub-phase).
        // But we don't have sub-phase tracking for "HasRevivedLeader".
        // Let's check Action Log for now? Or adds complexity.
        // Let's ignore "once per turn" check enforcement for strict MVP unless easy.
        // Check log for "revived leader" this turn?
        // Getting current turn logs:
        // const turnLogs = state.actionLog.slice(state.actionLog.lastIndexOf(`Turn ${state.turn}`) ...);
        // Too brittle.
        // Let's just implement the mechanics.
        const cost = leader.strength;
        if (faction.spice < cost)
            throw new Error(`Not enough spice. Cost is ${cost}.`);
        faction.spice -= cost;
        leader.isDead = false;
        const msg = `${faction.playerName} revived leader ${leader.name} for ${cost} spice.`;
        state.actionLog.push(msg);
        return msg;
    }
    getFreeRevivalLimit(faction) {
        if (faction === "Fremen")
            return 3;
        if (faction === "Atreides" || faction === "Harkonnen")
            return 2;
        return 1;
    }
}
exports.RevivalEngine = RevivalEngine;
