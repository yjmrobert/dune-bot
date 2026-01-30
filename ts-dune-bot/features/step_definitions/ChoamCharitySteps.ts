import { Given, When, Then, Before } from '@cucumber/cucumber';
import { expect } from 'chai';
import { GameEngine } from '../../src/engine/GameEngine';
import { ChoamCharityEngine } from '../../src/engine/ChoamCharityEngine';
import { GameState, Faction } from '../../src/types';
import { prisma } from '../../src/db';
import { TestContext } from '../support/TestContext';

const engine = new ChoamCharityEngine();

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

Given('a game is in the {string} phase', async function (phase: string) {
    if (TestContext.gameId === 0) {
        // Create basic game if not exists
        const initialState: GameState = {
            phase: phase, turn: 1, stormLocation: 0, factions: [], actionLog: [],
            auctionQueue: [], currentBid: 0, isBiddingRoundActive: false, boardState: {},
            spiceDeck: [], spiceDiscard: [], treacheryDeck: [], treacheryDiscard: [], nexusActive: false
        };
        const game = await prisma.game.create({
            data: { guildId: "test-choam", stateJson: JSON.stringify(initialState), categoryId: "c", actionsChannelId: "a", mapChannelId: "m", tableTalkChannelId: "t" }
        });
        TestContext.gameId = game.id;
    } else {
        const state = await getState(TestContext.gameId);
        state.phase = phase; // "CHOAM Charity" or whatever passed
        await saveState(TestContext.gameId, state);
    }
});

Given('faction {string} has {int} spice', async function (factionName: string, amount: number) {
    const state = await getState(TestContext.gameId);
    let faction = state.factions.find(f => f.faction === factionName);
    if (!faction) {
        state.factions.push({
            faction: factionName as any,
            playerDiscordId: `d-${factionName}`,
            playerName: factionName,
            spice: amount,
            reserves: 0,
            forcesInTanks: 0,
            leaders: [],
            traitors: [],
            hand: []
        });
    } else {
        faction.spice = amount;
    }
    await saveState(TestContext.gameId, state);
});

When('the CHOAM Charity phase is processed', async function () {
    const state = await getState(TestContext.gameId);
    const messages = engine.processCharity(state);
    state.actionLog.push(...messages);
    await saveState(TestContext.gameId, state);
});

Then('faction {string} should have {int} spice', async function (factionName: string, amount: number) {
    const state = await getState(TestContext.gameId);
    const faction = state.factions.find(f => f.faction === factionName);
    expect(faction?.spice).to.equal(amount);
});

Then('the action log should contain {string}', async function (messagePart: string) {
    const state = await getState(TestContext.gameId);
    const found = state.actionLog.some(log => log.includes(messagePart));
    expect(found).to.be.true;
});

Then('the action log should not contain {string}', async function (messagePart: string) {
    const state = await getState(TestContext.gameId);
    const found = state.actionLog.some(log => log.includes(messagePart));
    expect(found).to.be.false;
});
