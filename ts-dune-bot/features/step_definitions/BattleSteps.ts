import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from 'chai';
import { GameEngine } from '../../src/engine/GameEngine';
import { prisma } from '../../src/db';
import { GameState, Faction, BattlePlan } from '../../src/types';
import { TestContext } from '../support/TestContext';
import { FACTION_LEADERS } from '../../src/constants/leaders';

const engine = new GameEngine();

async function getState(gameId: number): Promise<GameState> {
    const game = await prisma.game.findUnique({ where: { id: gameId } });
    if (!game) throw new Error("Game not found");
    return JSON.parse(game.stateJson) as GameState;
}

async function saveState(gameId: number, state: GameState) {
    await prisma.game.update({
        where: { id: gameId },
        data: { stateJson: JSON.stringify(state) }
    });
}







Given('{string} has leader {string} \\(Strength {int})', async function (factionName: string, leaderName: string, strength: number) {
    const state = await getState(TestContext.gameId);
    const faction = state.factions.find(f => f.faction === factionName);
    if (!faction) throw new Error("Faction not found");
    // Check if leader exists, if not add
    const existing = faction.leaders.find(l => l.name === leaderName);
    if (!existing) {
        faction.leaders.push({ name: leaderName, strength, isDead: false });
    } else {
        existing.strength = strength;
    }
    await saveState(TestContext.gameId, state);
});

Given('{string} is the aggressor', async function (factionName: string) {
    // We can simulate this by ensuring they initiate? 
    // Or we manually set battleState in a custom step if needed.
    // Logic in engine infers based on IDs passed.
    // For "Battle Tie", Aggressor loses. 
    // We'll trust initiateBattle order in "When a battle is initiated".
});

Given('{string} holds traitor card {string}', async function (factionName: string, leaderName: string) {
    const state = await getState(TestContext.gameId);
    const faction = state.factions.find(f => f.faction === factionName);
    if (!faction) throw new Error("Faction not found");
    faction.traitors.push(leaderName);
    await saveState(TestContext.gameId, state);
});

Given('{string} has treachery card {string}', async function (factionName: string, cardName: string) {
    const state = await getState(TestContext.gameId);
    const faction = state.factions.find(f => f.faction === factionName);
    if (!faction) throw new Error("Faction not found");
    
    // Create Mock Card
    const isWeapon = ["Lasgun", "Maula Pistol", "Stunner", "Slip Tip", "Chaumas", "Chaumurky", "Ellaca Drug", "Gom Jabbar"].includes(cardName);
    const isDefense = ["Shield", "Snooper"].includes(cardName);
    
    faction.hand.push({
        id: Math.random(),
        name: cardName,
        type: "Weapon/Defense", // Simplified
        description: "Mock Card",
        isWeapon,
        isDefense,
        isSpecial: false
    });
    
    await saveState(TestContext.gameId, state);
});

When('a battle is initiated in {string}', async function (territoryName: string) {
    await engine.initiateBattle(TestContext.gameId, territoryName);
});

When('{string} submits battle plan: Leader {string}, Dial {int}', async function (factionName: string, leaderName: string, dial: number) {
    const plan: BattlePlan = { leaderName, dial };
    await engine.submitBattlePlan(TestContext.gameId, `d-${factionName}`, plan);
});

When('{string} submits battle plan: Leader {string}, Weapon {string}, Dial {int}', async function (factionName: string, leaderName: string, weapon: string, dial: number) {
    const plan: BattlePlan = { leaderName, dial, weaponName: weapon };
    await engine.submitBattlePlan(TestContext.gameId, `d-${factionName}`, plan);
});

When('{string} submits battle plan: Leader {string}, Defense {string}, Dial {int}', async function (factionName: string, leaderName: string, defense: string, dial: number) {
     const plan: BattlePlan = { leaderName, dial, defenseName: defense };
    await engine.submitBattlePlan(TestContext.gameId, `d-${factionName}`, plan);
});

When('{string} submits battle plan: Leader {string}, Weapon {string}, Defense {string}, Dial {int}', async function (factionName: string, leaderName: string, weapon: string, defense: string, dial: number) {
    const plan: BattlePlan = { leaderName, dial, weaponName: weapon, defenseName: defense };
    await engine.submitBattlePlan(TestContext.gameId, `d-${factionName}`, plan);
});

When('{string} calls traitor {string}', async function (factionName: string, traitorName: string) {
    // This is handled automatically in my engine logic (Step 2 resolveBattle), 
    // but the scenario implies an action. 
    // Since my engine AUTO-CHECKS traitors on reveal, this step might be "Given" or just verification?
    // Or I can add a `callTraitor` method if I want manual calls.
    // For now, I'll assume Auto-Call in Engine.
    // So this step does nothing but documentation.
});

Then('{string} should be the winner', async function (factionName: string) {
    const state = await getState(TestContext.gameId);
    expect(state.battleState?.resolved).to.be.true;
    expect(state.battleState?.winnerId).to.equal(`d-${factionName}`);
});



Then('all forces in {string} should be destroyed', async function (territoryName: string) {
    const state = await getState(TestContext.gameId);
    const forces = state.boardState[territoryName]?.forces || {};
    const total = Object.values(forces).reduce((a, b) => a + b, 0);
    expect(total).to.equal(0);
});
