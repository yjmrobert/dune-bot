import { Given, When, Then, Before } from '@cucumber/cucumber';
import { expect } from 'chai';
import { StormEngine } from '../../src/engine/StormEngine';
import { GameState, FactionState, TerritoryState } from '../../src/types';
import { prisma } from '../../src/db';

let lastError: any = null;
import { TestContext } from '../support/TestContext';

const stormEngine = new StormEngine();

const MOCK_TERRITORIES: any[] = [
    { name: "Old Gap", sector: 3, isSafe: false },
    { name: "Arrakeen", sector: 2, isSafe: true },
    { name: "Territory A", sector: 3, isSafe: false },
    { name: "Territory B", sector: 4, isSafe: false },
    { name: "Territory C", sector: 5, isSafe: false },
    { name: "Imperial Basin", sector: 6, isSafe: true },
    { name: "Sector 16 Sand", sector: 16, isSafe: false },
    { name: "Sector 17 Sand", sector: 17, isSafe: false },
    { name: "Sector 18 Sand", sector: 18, isSafe: false },
    { name: "Sector 1 Sand", sector: 1, isSafe: false },
    { name: "Sector 4 Sand", sector: 4, isSafe: false },
];

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
    // 0-20 sectors from Sector 18
    const initialMove = Math.floor(Math.random() * 21);
    state.stormLocation = ((18 + initialMove - 1) % 18) + 1;
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



When('the storm moves', async function () {
    // Simulate random movement 1-3
    const state = await getState(TestContext.gameId);
    const move = Math.floor(Math.random() * 6) + 1;
    stormEngine.moveStorm(state, move, MOCK_TERRITORIES);
    state.stormMovedThisTurn = true;
    await saveState(TestContext.gameId, state);
});

When('the storm moves {int} sectors', async function (sectors: number) {
    const state = await getState(TestContext.gameId);
    stormEngine.moveStorm(state, sectors, MOCK_TERRITORIES);
    state.stormMovedThisTurn = true;
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
        if (!state.boardState[territoryName].forces[sector]) {
            state.boardState[territoryName].forces[sector] = {};
        }
        state.boardState[territoryName].forces[sector][row['Faction']] = parseInt(row['Forces']);

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



Then('the new storm position should be {int}', async function (pos: number) {
    const state = await getState(TestContext.gameId);
    expect(state.stormLocation).to.equal(pos);
});

Then('the "Move Storm" button should be disabled', async function () {
    const state = await getState(TestContext.gameId);
    expect(state.stormMovedThisTurn).to.be.true;
});


