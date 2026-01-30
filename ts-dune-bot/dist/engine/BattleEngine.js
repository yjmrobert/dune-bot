"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BattleEngine = void 0;
const BoardService_1 = require("../services/BoardService");
class BattleEngine {
    initiateBattle(state, territory, aggressorId, defenderId) {
        state.battleState = {
            territory,
            aggressorId,
            defenderId,
            plans: {},
            resolved: false
        };
        state.actionLog.push(`Battle initiated in ${territory} between ${aggressorId} and ${defenderId}.`);
    }
    submitBattlePlan(state, factionId, plan) {
        if (!state.battleState)
            throw new Error("No active battle.");
        if (state.battleState.resolved)
            throw new Error("Battle already resolved.");
        // Validation
        const faction = state.factions.find(f => f.playerDiscordId === factionId);
        if (!faction)
            throw new Error("Participant not found.");
        // Check if involved
        if (factionId !== state.battleState.aggressorId && factionId !== state.battleState.defenderId) {
            throw new Error("You are not part of this battle.");
        }
        // Validate Dial
        // Sum forces across all sectors
        // Sum forces across all sectors
        const forces = BoardService_1.BoardService.getForces(state, state.battleState.territory);
        const forcesInTerritory = forces[faction.faction] || 0;
        // In Dune, you can dial up to forces you have in territory (or all + star forces etc, simplified here to forces)
        // Dial limitation: Max forces available. 
        if (plan.dial > forcesInTerritory) {
            throw new Error(`Cannot dial ${plan.dial}, you only have ${forcesInTerritory} forces.`);
        }
        if (plan.dial < 0)
            throw new Error("Internal Error: Negative dial.");
        // Validate Leader
        const leader = faction.leaders.find(l => l.name === plan.leaderName);
        if (!leader)
            throw new Error(`Leader ${plan.leaderName} not found.`);
        if (leader.isDead)
            throw new Error(`Leader ${leader.name} is dead.`);
        // Validate Cards
        if (plan.weaponName) {
            const card = faction.hand.find(c => c.name === plan.weaponName);
            if (!card)
                throw new Error(`You do not have weapon ${plan.weaponName}.`);
            if (!card.isWeapon)
                throw new Error(`${plan.weaponName} is not a weapon.`);
        }
        if (plan.defenseName) {
            const card = faction.hand.find(c => c.name === plan.defenseName);
            if (!card)
                throw new Error(`You do not have defense ${plan.defenseName}.`);
            if (!card.isDefense)
                throw new Error(`${plan.defenseName} is not a defense.`);
        }
        state.battleState.plans[factionId] = plan;
        state.actionLog.push(`${faction.faction} submitted a battle plan.`);
        // Check if both submitted
        const otherId = (factionId === state.battleState.aggressorId) ? state.battleState.defenderId : state.battleState.aggressorId;
        if (state.battleState.plans[otherId]) {
            this.resolveBattle(state);
        }
    }
    resolveBattle(state) {
        if (!state.battleState)
            return;
        const b = state.battleState;
        const aggId = b.aggressorId;
        const defId = b.defenderId;
        const aggPlan = b.plans[aggId];
        const defPlan = b.plans[defId];
        const aggFaction = state.factions.find(f => f.playerDiscordId === aggId);
        const defFaction = state.factions.find(f => f.playerDiscordId === defId);
        state.actionLog.push(`Resolving Battle in ${b.territory}!`);
        state.actionLog.push(`${aggFaction.faction} reveals: ${aggPlan.leaderName}, Weapon: ${aggPlan.weaponName || "None"}, Defense: ${aggPlan.defenseName || "None"}, Dial: ${aggPlan.dial}`);
        state.actionLog.push(`${defFaction.faction} reveals: ${defPlan.leaderName}, Weapon: ${defPlan.weaponName || "None"}, Defense: ${defPlan.defenseName || "None"}, Dial: ${defPlan.dial}`);
        // 1. Traitor Check
        // If Aggressor uses a leader that Defender holds as traitor -> Aggressor dies instantly. (Check rules: does defender win?)
        // Yes, Traitor Call = Instant Win for the one HOLDING the traitor card.
        // Assuming players AUTO-CALL traitors for MVP. TODO: Make it explicit if needed.
        let aggTraitor = defFaction.traitors.includes(aggPlan.leaderName);
        let defTraitor = aggFaction.traitors.includes(defPlan.leaderName);
        if (aggTraitor && defTraitor) {
            // Both are traitors. Both lose? Or turn counting?
            // Rules: Both players lose all forces and leaders involved.
            this.handleDoubleTraitor(state, aggFaction, defFaction, aggPlan, defPlan);
            return;
        }
        if (aggTraitor) {
            state.actionLog.push(`TRAITOR CALLED! ${aggPlan.leaderName} is working for ${defFaction.faction}!`);
            this.handleWin(state, defFaction, aggFaction, defPlan, aggPlan, true);
            return;
        }
        if (defTraitor) {
            state.actionLog.push(`TRAITOR CALLED! ${defPlan.leaderName} is working for ${aggFaction.faction}!`);
            this.handleWin(state, aggFaction, defFaction, aggPlan, defPlan, true);
            return;
        }
        // 2. Resolve Strength
        // Leaders Strength
        const aggLeader = aggFaction.leaders.find(l => l.name === aggPlan.leaderName);
        const defLeader = defFaction.leaders.find(l => l.name === defPlan.leaderName);
        // Weapons vs Defenses logic (Simplified)
        // Checks if Weapon Kills Leader.
        // Needs definition of Weapons and Defenses logic. This is complex.
        // For MVP/Context:
        // Lasgun kills unless Shield. 
        // Weapon kills if no matching Defense (Projectile vs Shield, Poison vs Snooper).
        // If Leader killed: Strength = 0.
        // If Lasgun + Shield = ATOMIC.
        const aggResult = this.calculateOutcome(aggPlan, defPlan, aggLeader.strength);
        const defResult = this.calculateOutcome(defPlan, aggPlan, defLeader.strength);
        // Atomic Check
        if (aggResult.isAtomic || defResult.isAtomic) {
            this.handleAtomic(state, b.territory);
            return;
        }
        const aggTotal = aggResult.finalStrength + aggPlan.dial;
        const defTotal = defResult.finalStrength + defPlan.dial;
        state.actionLog.push(`${aggFaction.faction} Total: ${aggTotal} (${aggResult.finalStrength} + ${aggPlan.dial})`);
        state.actionLog.push(`${defFaction.faction} Total: ${defTotal} (${defResult.finalStrength} + ${defPlan.dial})`);
        if (aggResult.leaderKilled) {
            state.actionLog.push(`${aggPlan.leaderName} was killed!`);
            aggLeader.isDead = true;
        }
        if (defResult.leaderKilled) {
            state.actionLog.push(`${defPlan.leaderName} was killed!`);
            defLeader.isDead = true;
        }
        if (aggTotal > defTotal) {
            this.handleWin(state, aggFaction, defFaction, aggPlan, defPlan, false);
        }
        else if (defTotal > aggTotal) {
            this.handleWin(state, defFaction, aggFaction, defPlan, aggPlan, false);
        }
        else {
            // Tie -> Defender wins
            state.actionLog.push("Tie! Defender wins.");
            this.handleWin(state, defFaction, aggFaction, defPlan, aggPlan, false);
        }
    }
    // Helper: Returns { finalStrength, leaderKilled, isAtomic }
    calculateOutcome(myPlan, enemyPlan, leaderStrength) {
        // Weapon/Defense Types:
        // Projectile: "Maula Pistol", "Stunner", "Slip Tip"
        // Poison: "Chaumas", "Chaumurky", "Ellaca Drug", "Gom Jabbar"
        // Defense: "Shield" (Projectiles), "Snooper" (Poisons)
        // Special: "Lasgun" (Projectile + Atomic risk)
        // Assume names match exactly for now.
        let killed = false;
        let atomic = false;
        const w = enemyPlan.weaponName;
        const d = myPlan.defenseName;
        // Clean names
        const weapon = w;
        const defense = d;
        if (weapon) {
            // Atomic Logic
            if (weapon === "Lasgun" && defense === "Shield") {
                return { finalStrength: 0, leaderKilled: true, isAtomic: true };
            }
            // Kill Logic (Simplified map)
            const isProjectile = ["Maula Pistol", "Stunner", "Slip Tip", "Lasgun"].includes(weapon);
            const isPoison = ["Chaumas", "Chaumurky", "Ellaca Drug", "Gom Jabbar"].includes(weapon);
            const blocksProjectile = defense === "Shield";
            const blocksPoison = defense === "Snooper";
            if (isProjectile && !blocksProjectile)
                killed = true;
            if (isPoison && !blocksPoison)
                killed = true;
        }
        return {
            finalStrength: killed ? 0 : leaderStrength,
            leaderKilled: killed,
            isAtomic: atomic
        };
    }
    handleWin(state, winner, loser, winnerPlan, loserPlan, isTraitorWin) {
        state.battleState.resolved = true;
        state.battleState.winnerId = winner.playerDiscordId;
        const tState = state.boardState[state.battleState.territory];
        // 1. Loser loses ALL forces in territory
        const forces = BoardService_1.BoardService.getForces(state, state.battleState.territory);
        const lostCount = forces[loser.faction] || 0;
        if (lostCount > 0) {
            BoardService_1.BoardService.removeForce(state, state.battleState.territory, loser.faction, lostCount);
            loser.forcesInTanks += lostCount;
            state.actionLog.push(`${loser.faction} lost ${lostCount} forces to the tanks.`);
        }
        // 2. Winner loses forces equal to DIAL
        if (!isTraitorWin) {
            const cost = winnerPlan.dial;
            if (cost > 0) {
                BoardService_1.BoardService.removeForce(state, state.battleState.territory, winner.faction, cost);
                winner.forcesInTanks += cost;
                state.actionLog.push(`${winner.faction} sacrificed ${cost} forces.`);
            }
        }
        else {
            state.actionLog.push(`${winner.faction} wins by Treachery! No forces lost.`);
        }
    }
    handleDoubleTraitor(state, agg, def, aggPlan, defPlan) {
        state.battleState.resolved = true;
        state.actionLog.push("Double Treachery! Both armies annihilated!");
        const terr = state.battleState.territory;
        const forces = BoardService_1.BoardService.getForces(state, terr);
        [agg, def].forEach(f => {
            const count = forces[f.faction] || 0;
            if (count > 0) {
                BoardService_1.BoardService.removeForce(state, terr, f.faction, count);
                f.forcesInTanks += count;
            }
        });
    }
    handleAtomic(state, territory) {
        state.battleState.resolved = true;
        state.actionLog.push(`ATOMICS! ${territory} is obliterated!`);
        const forces = BoardService_1.BoardService.getForces(state, territory);
        Object.keys(forces).forEach(fid => {
            const count = forces[fid];
            if (count > 0) {
                const fState = state.factions.find(f => f.faction === fid);
                if (fState) {
                    fState.forcesInTanks += count;
                }
                BoardService_1.BoardService.removeForce(state, territory, fid, count);
            }
        });
        // Remove Spice
        if (state.boardState[territory]) {
            state.boardState[territory].spice = 0;
        }
    }
}
exports.BattleEngine = BattleEngine;
