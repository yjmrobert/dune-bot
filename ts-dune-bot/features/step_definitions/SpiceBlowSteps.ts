import { Given, When, Then, Before } from '@cucumber/cucumber';
import { expect } from 'chai';
import { SpiceBlowEngine } from '../../src/engine/SpiceBlowEngine';
import { GameState, SpiceCard } from '../../src/types';
import { prisma } from '../../src/db';

import { TestContext } from '../support/TestContext';

const engine = new SpiceBlowEngine();

Before(() => {
    // No op - GameSetup handles reset or we trust context
    // Actually TestContext.gameId = 0 is done in GameSetupSteps?
    // Cucumber runs all Before hooks.
});

// Helper
async function getState(gameId: number): Promise<GameState> {
    const game = await prisma.game.findUnique({ where: { id: gameId } });
    if (!game) throw new Error("Game not found");
    return JSON.parse(game.stateJson) as GameState;
}

// Helper
async function saveState(gameId: number, state: GameState) {
    await prisma.game.update({ where: { id: gameId }, data: { stateJson: JSON.stringify(state) } });
}

// Helper to ensure game
async function ensureGame() {
    if (TestContext.gameId === 0) {
        const initialState: GameState = {
            phase: "Storm", turn: 1, stormLocation: 0, factions: [], actionLog: [], auctionQueue: [], currentBid: 0,
            isBiddingRoundActive: false, boardState: {}, spiceDeck: [], spiceDiscard: [], treacheryDeck: [], treacheryDiscard: [], nexusActive: false
        };
        const game = await prisma.game.create({
            data: { guildId: "test-spice", stateJson: JSON.stringify(initialState), categoryId: "c", actionsChannelId: "a", mapChannelId: "m", tableTalkChannelId: "t" }
        });
        TestContext.gameId = game.id;
    }
}

// Removed duplicate 'the game is in the string phase' step

Given('the next spice card A is {string}', async function (cardName: string) {
    await ensureGame();
    const state = await getState(TestContext.gameId);

    // Create card
    const card: SpiceCard = {
        id: Math.floor(Math.random() * 1000),
        name: cardName,
        type: cardName === "Shai-Hulud" ? "Shai-Hulud" : "Territory",
        amount: 10,
        sector: 8 // Default for testing obstruction
    };

    // We put it at the start of deck (shift/pop logic?)
    // Logic uses shift(). So put at 0.
    state.spiceDeck.unshift(card);
    await saveState(TestContext.gameId, state);
});

When('the spice blow is resolved', async function () {
    const state = await getState(TestContext.gameId);
    engine.resolveSpiceBlow(state);
    await saveState(TestContext.gameId, state);
});

Then('territory {string} should have {int} spice', async function (tName: string, amount: number) {
    const state = await getState(TestContext.gameId);
    const actual = state.boardState[tName]?.spice || 0;
    expect(actual).to.equal(amount);
});

Given('{string} is in the storm', async function (tName: string) {
    const state = await getState(TestContext.gameId);
    state.stormLocation = 8; // Matching the default sector for test cards
    await saveState(TestContext.gameId, state);
});

// Scenario: "The Great Flat" (Sector 8) is in the storm (Sector 8)
Given('{string} \\(Sector {int}) is in the storm \\(Sector {int})', async function (tName: string, tSec: number, sSec: number) {
    const state = await getState(TestContext.gameId);
    state.stormLocation = sSec;
    // Update Deck card sector if it matches
    const card = state.spiceDeck[0];
    if (card && card.name === tName) {
        card.sector = tSec;
    }
    await saveState(TestContext.gameId, state);
});

Given('the discard pile has {string} on top', async function (cardName: string) {
    await ensureGame();
    const state = await getState(TestContext.gameId);
    state.spiceDiscard.push({
        id: 1, name: cardName, type: "Territory", amount: 10
    });
    await saveState(TestContext.gameId, state);
});

Given('territory {string} has {int} spice', async function (tName: string, amount: number) {
    await ensureGame();
    const state = await getState(TestContext.gameId);
    if (!state.boardState[tName]) state.boardState[tName] = { name: tName, spice: 0, forces: {} };
    state.boardState[tName].spice = amount;
    await saveState(TestContext.gameId, state);
});

Given('{string} has {int} forces in {string}', async function (factionName: string, count: number, tName: string) {
    await ensureGame();
    const state = await getState(TestContext.gameId);

    // Ensure faction exists
    let faction = state.factions.find(f => f.faction === factionName);
    if (!faction) {
        faction = {
            faction: factionName as any,
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

    if (!state.boardState[tName]) state.boardState[tName] = { name: tName, spice: 0, forces: {} };
    if (!state.boardState[tName].forces[0]) state.boardState[tName].forces[0] = {};
    state.boardState[tName].forces[0][factionName] = count;
    await saveState(TestContext.gameId, state);
});

Given('the next spice card B is {string}', async function (cardName: string) {
    const state = await getState(TestContext.gameId);
    // Insert at 1
    const card: SpiceCard = {
        id: Math.floor(Math.random() * 1000),
        name: cardName,
        type: cardName === "Shai-Hulud" ? "Shai-Hulud" : "Territory",
        amount: 10
    };
    state.spiceDeck.splice(1, 0, card);
    await saveState(TestContext.gameId, state);
});

Given('the next spice card C is {string}', async function (cardName: string) {
    const state = await getState(TestContext.gameId);
    // Insert at 2
    const card: SpiceCard = {
        id: Math.floor(Math.random() * 1000),
        name: cardName,
        type: cardName === "Shai-Hulud" ? "Shai-Hulud" : "Territory",
        amount: 10
    };
    state.spiceDeck.splice(2, 0, card);
    await saveState(TestContext.gameId, state);
});

Then('the spice discard pile should contain {string}', async function (cardName: string) {
    const state = await getState(TestContext.gameId);
    const found = state.spiceDiscard.some(c => c.name === cardName);
    expect(found).to.be.true;
});

Then('a Nexus should occur', async function () {
    const state = await getState(TestContext.gameId);
    expect(state.nexusActive).to.be.true;
});

Then('{string} should have {int} forces in {string}', async function (factionName: string, count: number, tName: string) {
    const state = await getState(TestContext.gameId);
    // Forces are stored by sector -> faction -> count. Summing across all sectors.
    const forcesMap = state.boardState[tName]?.forces || {};
    const actual = Object.values(forcesMap).reduce((sum, sectorForces: any) => {
        return sum + (sectorForces[factionName] || 0);
    }, 0);
    expect(actual).to.equal(count);
});

Given('the game is in Turn {int}', async function (turn: number) {
    await ensureGame();
    const state = await getState(TestContext.gameId);
    state.turn = turn;
    await saveState(TestContext.gameId, state);
});

Then('a Nexus should not occur', async function () {
    const state = await getState(TestContext.gameId);
    expect(state.nexusActive).to.be.false;
});

Then('the Spice Deck should contain {string}', async function (cardName: string) {
    const state = await getState(TestContext.gameId);
    const found = state.spiceDeck.some(c => c.name === cardName);
    expect(found).to.be.true;
});
