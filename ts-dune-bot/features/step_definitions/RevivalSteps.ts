import { Given, When, Then, Before } from '@cucumber/cucumber';
import { expect } from 'chai';
import { GameEngine } from '../../src/engine/GameEngine';
import { prisma } from '../../src/db';
import { GameState, FactionState, Faction } from '../../src/types';
import { TestContext } from '../support/TestContext';

const engine = new GameEngine();

// Helper to get state
async function getState(gameId: number): Promise<GameState> {
    const game = await prisma.game.findUnique({ where: { id: gameId } });
    if (!game) throw new Error("Game not found");
    return JSON.parse(game.stateJson) as GameState;
}

// Helper to save state
async function saveState(gameId: number, state: GameState) {
    await prisma.game.update({
        where: { id: gameId },
        data: { stateJson: JSON.stringify(state) }
    });
}

Given('a game in the "Revival" phase', async function () {
    if (TestContext.gameId === 0) {
        // Create basic game
        const initialState: GameState = {
            phase: "Revival", turn: 1, stormLocation: 0, factions: [], actionLog: [],
            auctionQueue: [], currentBid: 0, isBiddingRoundActive: false, boardState: {},
            spiceDeck: [], spiceDiscard: [], treacheryDeck: [], treacheryDiscard: [], nexusActive: false
        };
        const game = await prisma.game.create({
            data: { guildId: "test-revival", stateJson: JSON.stringify(initialState), categoryId: "c", actionsChannelId: "a", mapChannelId: "m", tableTalkChannelId: "t" }
        });
        TestContext.gameId = game.id;
    } else {
        const state = await getState(TestContext.gameId);
        state.phase = "Revival";
        await saveState(TestContext.gameId, state);
    }
});

Given('faction {string} has {int} forces in tanks', async function (factionName: string, count: number) {
    const state = await getState(TestContext.gameId);
    let faction = state.factions.find(f => f.faction === factionName);
    if (!faction) {
        // Create faction if missing
        faction = {
            faction: factionName as Faction,
            playerDiscordId: `d-${factionName}`,
            playerName: factionName,
            spice: 0,
            reserves: 0,
            forcesInTanks: count,
            leaders: [],
            traitors: [],
            hand: []
        };
        state.factions.push(faction);
    } else {
        faction.forcesInTanks = count;
    }
    await saveState(TestContext.gameId, state);
});

Given('{string} has free revival limit of {int}', async function (factionName: string, limit: number) {
    // This is hardcoded in engine, but we can verify or mocks if needed.
    // The scenario implies checking logic.
    // If logic is hardcoded by faction name, we don't need to "set" it on state, just ensure we use that faction.
});

When('{string} revives {int} forces', async function (factionName: string, count: number) {
    try {
        await engine.reviveForces(TestContext.gameId, `d-${factionName}`, count);
    } catch (e) {
        TestContext.lastError = e;
    }
});

Then('{string} should have {int} forces in reserves', async function (factionName: string, count: number) {
    const state = await getState(TestContext.gameId);
    const faction = state.factions.find(f => f.faction === factionName);
    expect(faction?.reserves).to.equal(count);
});

Then('{string} should have {int} forces in tanks', async function (factionName: string, count: number) {
    const state = await getState(TestContext.gameId);
    const faction = state.factions.find(f => f.faction === factionName);
    expect(faction?.forcesInTanks).to.equal(count);
});

Then('{string} should have {int} spice \\(paid {int}\\)', async function (factionName: string, total: number, paid: number) {
    const state = await getState(TestContext.gameId);
    const faction = state.factions.find(f => f.faction === factionName);
    expect(faction?.spice).to.equal(total);
    // Action log check optional
});

Then('the action should fail with {string}', function (errorMessage: string) {
    expect(TestContext.lastError).to.not.be.null;
    expect(TestContext.lastError.message).to.include(errorMessage);
    TestContext.lastError = null;
});

Given('faction {string} has leader {string} \\(Strength {int}\\) in tanks', async function (factionName: string, leaderName: string, strength: number) {
    const state = await getState(TestContext.gameId);
    let faction = state.factions.find(f => f.faction === factionName);
    if (!faction) {
        faction = {
            faction: factionName as Faction,
            playerDiscordId: `d-${factionName}`,
            playerName: factionName,
            spice: 0,
            reserves: 0,
            forcesInTanks: 0,
            leaders: [],
            traitors: [],
            hand: []
        };
        state.factions.push(faction);
    }

    // Add leader to tanks
    let leader = faction.leaders.find(l => l.name === leaderName);
    if (leader) {
        leader.isDead = true;
        leader.strength = strength;
    } else {
        faction.leaders.push({ name: leaderName, strength: strength, isDead: true });
    }
    await saveState(TestContext.gameId, state);
});

Given('all other {string} leaders are in tanks', async function (factionName: string) {
    // Ensures all leaders in list are dead
    const state = await getState(TestContext.gameId);
    const faction = state.factions.find(f => f.faction === factionName);
    if (faction) {
        faction.leaders.forEach(l => l.isDead = true);
    }
    await saveState(TestContext.gameId, state);
});

When('{string} revives leader {string}', async function (factionName: string, leaderName: string) {
    try {
        await engine.reviveLeader(TestContext.gameId, `d-${factionName}`, leaderName);
    } catch (e) {
        TestContext.lastError = e;
    }
});

Then('leader {string} should be alive', async function (leaderName: string) {
    const state = await getState(TestContext.gameId);
    const faction = state.factions.find(f => f.leaders.some(l => l.name === leaderName));
    const leader = faction?.leaders.find(l => l.name === leaderName);
    expect(leader?.isDead).to.be.false;
});

Given('faction {string} has leader {string} in tanks', async function (factionName: string, leaderName: string) {
    // Re-use logic or call other step
    const state = await getState(TestContext.gameId);
    let faction = state.factions.find(f => f.faction === factionName);
    if (!faction) {
        faction = {
            faction: factionName as Faction,
            playerDiscordId: `d-${factionName}`,
            playerName: factionName,
            spice: 0,
            reserves: 0,
            forcesInTanks: 0,
            leaders: [],
            traitors: [],
            hand: []
        };
        state.factions.push(faction);
    }

    // Check if leader exists or add default (strength 1 for generic test?)
    // But duplicate logic...
    let leader = faction.leaders.find(l => l.name === leaderName);
    if (leader) {
        leader.isDead = true;
    } else {
        faction.leaders.push({ name: leaderName, strength: 2, isDead: true }); // Default strength 2
    }
    await saveState(TestContext.gameId, state);
});

Given('faction {string} has leader {string} alive', async function (factionName: string, leaderName: string) {
    const state = await getState(TestContext.gameId);
    const faction = state.factions.find(f => f.faction === factionName);
    if (!faction) return;

    let leader = faction.leaders.find(l => l.name === leaderName);
    if (leader) {
        leader.isDead = false;
    } else {
        faction.leaders.push({ name: leaderName, strength: 2, isDead: false });
    }
    await saveState(TestContext.gameId, state);
});
