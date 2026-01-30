import { GameState, BattlePlan, FactionState, TreacheryCard } from "../types";
import { FACTION_LEADERS } from "../constants/leaders";

export class BattleEngine {
    
    initiateBattle(state: GameState, territory: string, aggressorId: string, defenderId: string) {
        state.battleState = {
            territory,
            aggressorId,
            defenderId,
            plans: {},
            resolved: false
        };
        state.actionLog.push(`Battle initiated in ${territory} between ${aggressorId} and ${defenderId}.`);
    }

    submitBattlePlan(state: GameState, factionId: string, plan: BattlePlan) {
        if (!state.battleState) throw new Error("No active battle.");
        if (state.battleState.resolved) throw new Error("Battle already resolved.");
        
        // Validation
        const faction = state.factions.find(f => f.playerDiscordId === factionId);
        if (!faction) throw new Error("Participant not found.");

        // Check if involved
        if (factionId !== state.battleState.aggressorId && factionId !== state.battleState.defenderId) {
            throw new Error("You are not part of this battle.");
        }

        // Validate Dial
        const forcesInTerritory = state.boardState[state.battleState.territory]?.forces[faction.faction] || 0;
        // In Dune, you can dial up to forces you have in territory (or all + star forces etc, simplified here to forces)
        // Dial limitation: Max forces available. 
        if (plan.dial > forcesInTerritory) {
            throw new Error(`Cannot dial ${plan.dial}, you only have ${forcesInTerritory} forces.`);
        }
        if (plan.dial < 0) throw new Error("Internal Error: Negative dial.");

        // Validate Leader
        const leader = faction.leaders.find(l => l.name === plan.leaderName);
        if (!leader) throw new Error(`Leader ${plan.leaderName} not found.`);
        if (leader.isDead) throw new Error(`Leader ${leader.name} is dead.`);

        // Validate Cards
        if (plan.weaponName) {
            const card = faction.hand.find(c => c.name === plan.weaponName);
            if (!card) throw new Error(`You do not have weapon ${plan.weaponName}.`);
            if (!card.isWeapon) throw new Error(`${plan.weaponName} is not a weapon.`);
        }
        if (plan.defenseName) {
             const card = faction.hand.find(c => c.name === plan.defenseName);
            if (!card) throw new Error(`You do not have defense ${plan.defenseName}.`);
            if (!card.isDefense) throw new Error(`${plan.defenseName} is not a defense.`);
        }

        state.battleState.plans[factionId] = plan;
        state.actionLog.push(`${faction.faction} submitted a battle plan.`);

        // Check if both submitted
        const otherId = (factionId === state.battleState.aggressorId) ? state.battleState.defenderId : state.battleState.aggressorId;
        if (state.battleState.plans[otherId]) {
            this.resolveBattle(state);
        }
    }

    resolveBattle(state: GameState) {
        if (!state.battleState) return;
        const b = state.battleState;
        
        const aggId = b.aggressorId;
        const defId = b.defenderId;
        const aggPlan = b.plans[aggId];
        const defPlan = b.plans[defId];

        const aggFaction = state.factions.find(f => f.playerDiscordId === aggId)!;
        const defFaction = state.factions.find(f => f.playerDiscordId === defId)!;

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
        const aggLeader = aggFaction.leaders.find(l => l.name === aggPlan.leaderName)!;
        const defLeader = defFaction.leaders.find(l => l.name === defPlan.leaderName)!;
        
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
        } else if (defTotal > aggTotal) {
             this.handleWin(state, defFaction, aggFaction, defPlan, aggPlan, false);
        } else {
            // Tie -> Defender wins
            state.actionLog.push("Tie! Defender wins.");
            this.handleWin(state, defFaction, aggFaction, defPlan, aggPlan, false);
        }
    }

    // Helper: Returns { finalStrength, leaderKilled, isAtomic }
    private calculateOutcome(myPlan: BattlePlan, enemyPlan: BattlePlan, leaderStrength: number) {
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

            if (isProjectile && !blocksProjectile) killed = true;
            if (isPoison && !blocksPoison) killed = true;
        }

        return {
            finalStrength: killed ? 0 : leaderStrength,
            leaderKilled: killed,
            isAtomic: atomic
        };
    }

    private handleWin(state: GameState, winner: FactionState, loser: FactionState, winnerPlan: BattlePlan, loserPlan: BattlePlan, isTraitorWin: boolean) {
        state.battleState!.resolved = true;
        state.battleState!.winnerId = winner.playerDiscordId;

        // 1. Loser loses ALL forces in territory
        if (state.boardState[state.battleState!.territory].forces[loser.faction]) {
            const lost = state.boardState[state.battleState!.territory].forces[loser.faction];
            state.boardState[state.battleState!.territory].forces[loser.faction] = 0;
            loser.forcesInTanks += lost;
            state.actionLog.push(`${loser.faction} lost ${lost} forces to the tanks.`);
        }

        // 2. Winner loses forces equal to DIAL (unless traitor win?)
        // Rules: If traitor, winner loses NOTHING. 
        if (!isTraitorWin) {
            const cost = winnerPlan.dial;
            if (state.boardState[state.battleState!.territory].forces[winner.faction] >= cost) {
                 state.boardState[state.battleState!.territory].forces[winner.faction] -= cost;
                 winner.forcesInTanks += cost;
                 state.actionLog.push(`${winner.faction} sacrificed ${cost} forces.`);
            } else {
                 // Should not happen if validated
            }
        } else {
            state.actionLog.push(`${winner.faction} wins by Treachery! No forces lost.`);
        }

        // Cleanup empty
        Object.keys(state.boardState[state.battleState!.territory].forces).forEach(f => {
            if (state.boardState[state.battleState!.territory].forces[f] === 0) {
                delete state.boardState[state.battleState!.territory].forces[f];
            }
        });
    }

    private handleDoubleTraitor(state: GameState, agg: FactionState, def: FactionState, aggPlan: BattlePlan, defPlan: BattlePlan) {
        state.battleState!.resolved = true;
        state.actionLog.push("Double Treachery! Both armies annihilated!");
         // Everybody dies
        const terr = state.battleState!.territory;
        [agg, def].forEach(f => {
             const count = state.boardState[terr].forces[f.faction] || 0;
             state.boardState[terr].forces[f.faction] = 0;
             f.forcesInTanks += count;
        });
    }

    private handleAtomic(state: GameState, territory: string) {
        state.battleState!.resolved = true;
        state.actionLog.push(`ATOMICS! ${territory} is obliterated!`);
        // Kill everyone in territory
        const forces = state.boardState[territory].forces;
         Object.keys(forces).forEach(fid => {
             const fState = state.factions.find(f => f.faction === fid);
             if (fState) {
                 fState.forcesInTanks += forces[fid];
             }
             forces[fid] = 0;
         });
         // Destroy Spice? Usually yes.
         state.boardState[territory].spice = 0;
    }
}
