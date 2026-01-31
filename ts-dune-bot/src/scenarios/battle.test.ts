
import { describe, it, expect } from 'vitest';
import { GameEngine } from '../engine/GameEngine';
import { ScenarioRunner } from './ScenarioRunner';
import { Faction } from '../types';

describe('Scenario: Battle Phase', () => {
    const engine = new GameEngine();

    it('battle_basic_resolution: Harkonnen beats Atreides by Strength', () => {
        // Setup
        const runner = new ScenarioRunner()
            .withPhase("Battle")
            .withFaction(Faction.Atreides, "Paul", 10)
            .withFaction(Faction.Harkonnen, "Baron", 10)
            .withForcesInTerritory(Faction.Atreides, "Arrakeen", 1, 10)
            .withForcesInTerritory(Faction.Harkonnen, "Arrakeen", 1, 10);

        let state = runner.build();
        const atreidesId = runner.getFactionId(Faction.Atreides);
        const harkonnenId = runner.getFactionId(Faction.Harkonnen);

        // Initiate
        state = engine.initiateBattle(state, "Arrakeen");

        // Submit Plans
        // Atreides: Leader Strength 5 (Gurney Halleck is 4, Duncan 2... Let's use generic names if constants not linked)
        // Constants used: FACTION_LEADERS. Atreides: Gurney(4), Lady Jessica(5). Harkonnen: Feyd(6).
        state = engine.submitBattlePlan(state, atreidesId, {
            leaderName: "Lady Jessica", // Strength 5
            dial: 5,
            weaponName: undefined,
            defenseName: undefined
        });

        state = engine.submitBattlePlan(state, harkonnenId, {
            leaderName: "Feyd-Rautha", // Strength 6
            dial: 5,
            weaponName: undefined,
            defenseName: undefined
        });

        // Resolve triggered automatically on second submit
        expect(state.battleState?.resolved).toBe(true);
        expect(state.battleState?.winnerId).toBe(harkonnenId);

        // Assertions: 
        // Harkonnen: 6 (Leader) + 5 (Dial) = 11.
        // Atreides: 5 (Leader) + 5 (Dial) = 10.
        // Winner (Harkonnen) loses dial amount (5).
        // Loser (Atreides) loses all in territory (10).

        // Check Tanks
        const atreides = state.factions.find(f => f.faction === Faction.Atreides)!;
        const harkonnen = state.factions.find(f => f.faction === Faction.Harkonnen)!;

        expect(atreides.forcesInTanks).toBe(10);
        expect(harkonnen.forcesInTanks).toBe(5);
    });

    it('battle_traitor_call: Instant win', () => {
        const runner = new ScenarioRunner()
            .withPhase("Battle")
            .withFaction(Faction.Atreides)
            .withFaction(Faction.Harkonnen)
            .withForcesInTerritory(Faction.Atreides, "Carthag", 1, 5)
            .withForcesInTerritory(Faction.Harkonnen, "Carthag", 1, 5)
            // Harkonnen holds Duncan Idaho as Traitor (Duncan is Atreides leader)
            .withTraitor(Faction.Harkonnen, Faction.Atreides, "Duncan Idaho");

        let state = runner.build();
        const atreidesId = runner.getFactionId(Faction.Atreides);
        const harkonnenId = runner.getFactionId(Faction.Harkonnen);

        state = engine.initiateBattle(state, "Carthag");

        // Atreides plays Duncan
        state = engine.submitBattlePlan(state, atreidesId, {
            leaderName: "Duncan Idaho",
            dial: 5
        });

        state = engine.submitBattlePlan(state, harkonnenId, {
            leaderName: "Beast Rabban",
            dial: 0 // Even with 0 dial, Traitor wins
        });

        expect(state.battleState?.resolved).toBe(true);
        expect(state.battleState?.winnerId).toBe(harkonnenId);
        expect(state.actionLog).toContainEqual(expect.stringContaining("TRAITOR CALLED"));

        // Winner (Harkonnen) loses NOTHING for traitor win
        const harkonnen = state.factions.find(f => f.faction === Faction.Harkonnen)!;
        expect(harkonnen.forcesInTanks).toBe(0);
    });

    it('battle_lasgun_shield: Atomic explosion', () => {
        const runner = new ScenarioRunner()
            .withPhase("Battle")
            .withFaction(Faction.Atreides)
            .withFaction(Faction.Harkonnen)
            .withForcesInTerritory(Faction.Atreides, "Sietch Tabr", 1, 5)
            .withForcesInTerritory(Faction.Harkonnen, "Sietch Tabr", 1, 5)
            .withCard(Faction.Atreides, "Lasgun", "Weapon")
            .withCard(Faction.Harkonnen, "Shield", "Defense");

        let state = runner.build();
        const atreidesId = runner.getFactionId(Faction.Atreides);
        const harkonnenId = runner.getFactionId(Faction.Harkonnen);

        state = engine.initiateBattle(state, "Sietch Tabr");

        state = engine.submitBattlePlan(state, atreidesId, {
            leaderName: "Thufir Hawat",
            dial: 1,
            weaponName: "Lasgun"
        });

        state = engine.submitBattlePlan(state, harkonnenId, {
            leaderName: "Piter de Vries",
            dial: 1,
            defenseName: "Shield"
        });

        expect(state.battleState?.resolved).toBe(true);
        expect(state.actionLog).toContainEqual(expect.stringContaining("ATOMICS"));

        // Assert Territory Forces Gone
        const terr = state.boardState["Sietch Tabr"];
        // Forces should be removed
        expect(terr.forces?.[1]?.[Faction.Atreides] || 0).toBe(0);
        expect(terr.forces?.[1]?.[Faction.Harkonnen] || 0).toBe(0);
    });
});
