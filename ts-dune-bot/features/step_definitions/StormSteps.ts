import { Given, When, Then, Before } from '@cucumber/cucumber';
import { expect } from 'chai';
import { StormEngine } from '../../src/engine/StormEngine';
import { GameState, FactionState, TerritoryState } from '../../src/types';
import { prisma } from '../../src/db';

let lastError: any = null;
import { TestContext } from '../support/TestContext';

const stormEngine = new StormEngine();

Before(() => {
    // No-op
});

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

Given('a new game is starting', async function () {
    const initialState: GameState = {
        phase: "Setup",
        turn: 0,
        stormLocation: 0,
        factions: [],
        actionLog: [],
        auctionQueue: [],
        currentBid: 0,
        isBiddingRoundActive: false,
        spiceDeck: [],
        spiceDiscard: [],
        treacheryDeck: [],
        treacheryDiscard: [],
        nexusActive: false,
        boardState: {}
    };
    const game = await prisma.game.create({
        data: {
            guildId: "test-storm",
            stateJson: JSON.stringify(initialState),
            categoryId: "c", actionsChannelId: "a", mapChannelId: "m", tableTalkChannelId: "t"
        }
    });
    TestContext.gameId = game.id;
});

When('the First Storm occurs', async function () {
    const state = await getState(TestContext.gameId);
    state.stormLocation = Math.floor(Math.random() * 18) + 1; // Simulate first storm logic
    await saveState(TestContext.gameId, state);
});

Then('the new storm position should be between {int} and {int}', async function (min: number, max: number) {
    const state = await getState(TestContext.gameId);
    expect(state.stormLocation).to.be.gte(min);
    expect(state.stormLocation).to.be.lte(max);
});

Given('the current storm position is sector {int}', async function (location: number) {
    // If game doesn't exist, create it (reuse new game logic if needed, or assume sequential)
    if (TestContext.gameId === 0) {
        // Create dummy
        const initialState: GameState = {
            phase: "Setup",
            turn: 0, stormLocation: location, factions: [], actionLog: [], auctionQueue: [], currentBid: 0, isBiddingRoundActive: false, boardState: {},
            spiceDeck: [], spiceDiscard: [], treacheryDeck: [], treacheryDiscard: [], nexusActive: false
        };
        const game = await prisma.game.create({
            data: { guildId: "test-storm-2", stateJson: JSON.stringify(initialState), categoryId: "c", actionsChannelId: "a", mapChannelId: "m", tableTalkChannelId: "t" }
        });
        TestContext.gameId = game.id;
    } else {
        const state = await getState(TestContext.gameId);
        state.stormLocation = location;
        await saveState(TestContext.gameId, state);
    }
});

Given('the game is in Turn {int}', async function (turn: number) {
    const state = await getState(TestContext.gameId);
    state.turn = turn;
    await saveState(TestContext.gameId, state);
});

When('the storm moves', async function () {
    // Simulate random movement 1-3
    const state = await getState(TestContext.gameId);
    const move = Math.floor(Math.random() * 3) + 1;
    stormEngine.moveStorm(state, move);
    await saveState(TestContext.gameId, state);
});

When('the storm moves {int} sectors', async function (sectors: number) {
    const state = await getState(TestContext.gameId);
    stormEngine.moveStorm(state, sectors);
    await saveState(TestContext.gameId, state);
});

Given('the following forces are in {string} \\(Sector {int}):', async function (territoryName: string, sector: number, dataTable: any) {
    const state = await getState(TestContext.gameId);

    // Ensure BoardState territory exists
    if (!state.boardState[territoryName]) {
        state.boardState[territoryName] = { name: territoryName, spice: 0, forces: {} };
    }

    const rows = dataTable.hashes();
    for (const row of rows) {
        state.boardState[territoryName].forces[row['Faction']] = parseInt(row['Forces']);

        // Ensure faction exists in state for checks
        if (!state.factions.find(f => f.faction === row['Faction'])) {
            state.factions.push({
                faction: row['Faction'] as any,
                playerDiscordId: "d", playerName: row['Faction'],
                spice: 0, reserves: 0, forcesInTanks: 0, leaders: [], traitors: [], hand: []
            });
        }
    }
    await saveState(TestContext.gameId, state);
});

Given('{string} \\(Sector {int}) has {int} Spice', async function (territoryName: string, sector: number, amount: number) {
    const state = await getState(TestContext.gameId);
    if (!state.boardState[territoryName]) {
        state.boardState[territoryName] = { name: territoryName, spice: 0, forces: {} };
    }
    state.boardState[territoryName].spice = amount;
    await saveState(TestContext.gameId, state);
});

Then('{string} should have {int} forces in {string}', async function (factionName: string, count: number, territoryName: string) {
    const state = await getState(TestContext.gameId);
    const actual = state.boardState[territoryName]?.forces[factionName] || 0;
    expect(actual).to.equal(count);
});

Then('{string} should have {int} Spice', async function (territoryName: string, amount: number) {
    const state = await getState(TestContext.gameId);
    const actual = state.boardState[territoryName]?.spice || 0;
    expect(actual).to.equal(amount);
});

Given('the players are seated as follows:', async function (dataTable: any) {
    if (TestContext.gameId === 0) {
        const initialState: GameState = {
            phase: "Setup",
            turn: 0, stormLocation: 0, factions: [], actionLog: [], auctionQueue: [], currentBid: 0, isBiddingRoundActive: false, boardState: {},
            spiceDeck: [], spiceDiscard: [], treacheryDeck: [], treacheryDiscard: [], nexusActive: false
        };
        const game = await prisma.game.create({
            data: { guildId: "test-storm-3", stateJson: JSON.stringify(initialState), categoryId: "c", actionsChannelId: "a", mapChannelId: "m", tableTalkChannelId: "t" }
        });
        TestContext.gameId = game.id;
    }

    // We mock the seating order in the implementation
    // For now, let's assume standard order A, H, F, E, G, B
    // We populate the factions in that order
    const state = await getState(TestContext.gameId);
    state.factions = [];
    const rows = dataTable.hashes();
    for (const row of rows) {
        state.factions.push({
            faction: row['Faction'] as any,
            playerDiscordId: `d-${row['Faction']}`,
            playerName: row['Faction'],
            spice: 0, reserves: 0, forcesInTanks: 0, leaders: [], traitors: [], hand: []
        });
    }
    await saveState(TestContext.gameId, state);
});

When('the storm moves to sector {int}', async function (targetSector: number) {
    const state = await getState(TestContext.gameId);
    // Force set
    state.stormLocation = targetSector;
    // Trigger First Player Calc
    stormEngine.determineFirstPlayer(state);
    await saveState(TestContext.gameId, state);
    // Storm Engine methods operate on valid object but do not save to DB themselves implicitly unless wired to GameEngine flow.
    // StormSteps uses `stormEngine` directly on `state` object.
    // So saveState IS required here IF stormEngine is pure logic.
    // StormEngine.ts `moveStorm` returns number, updates state object inplace.
    // So for StormSteps, saveState is CORRECT.
});

Then('the First Player should be {string}', async function (factionName: string) {
    const state = await getState(TestContext.gameId);
    const fp = state.factions.find(f => f.playerDiscordId === state.firstPlayerId);
    expect(fp?.faction).to.equal(factionName);
});
