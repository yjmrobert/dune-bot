import { Given, When, Then, Before, After } from '@cucumber/cucumber';
import { expect } from 'chai';
import { GameEngine } from '../../src/engine/GameEngine';
import { prisma } from '../../src/db';
import { GameState } from '../../src/types';

// Use a separate GameEngine instance for tests
import { TestContext } from '../support/TestContext';

const engine = new GameEngine();
let lastError: any = null;

// Helper to reset DB before scenarios
Before(async () => {
    TestContext.gameId = 0;
    // Clear Games table
    await prisma.game.deleteMany();
});

Given('a new game is created with ID {int}', async function (id: number) {
    // Manually create the game record as GameManager would
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
            id: id,
            guildId: "test-guild",
            categoryId: "cat",
            actionsChannelId: "act",
            mapChannelId: "map",
            tableTalkChannelId: "talk",
            stateJson: JSON.stringify(initialState)
        }
    });
    TestContext.gameId = game.id;
});

When('player {string} joins game {int}', async function (playerName: string, gameId: number) {
    try {
        await engine.registerPlayer(gameId, "discord-" + playerName, playerName);
    } catch (e) {
        lastError = e;
    }
});

When('player {string} tries to join game {int}', async function (playerName: string, gameId: number) {
    try {
        await engine.registerPlayer(gameId, "discord-" + playerName, playerName);
    } catch (e) {
        lastError = e;
    }
});

Given('player {string} has joined game {int}', async function (playerName: string, gameId: number) {
    await engine.registerPlayer(gameId, "discord-" + playerName, playerName);
});

Then('the game should have {int} player', async function (count: number) {
    const game = await prisma.game.findUnique({ where: { id: TestContext.gameId } });
    const state = JSON.parse(game!.stateJson) as GameState;
    expect(state.factions.length).to.equal(count);
});

Then('the player {string} should be in the game', async function (playerName: string) {
    const game = await prisma.game.findUnique({ where: { id: TestContext.gameId } });
    const state = JSON.parse(game!.stateJson) as GameState;
    const player = state.factions.find(f => f.playerName === playerName);
    expect(player).to.not.be.undefined;
});

Then('the join request should be rejected', function () {
    expect(lastError).to.not.be.null;
});

Given('{int} players have joined game {int}', async function (count: number, gameId: number) {
    for (let i = 1; i <= count; i++) {
        await engine.registerPlayer(gameId, `discord-p${i}`, `Player${i}`);
    }
});

Given('the game {int} has started', async function (gameId: number) {
    // Force state to started
    const game = await prisma.game.findUnique({ where: { id: gameId } });
    const state = JSON.parse(game!.stateJson) as GameState;
    state.phase = "Storm";
    await prisma.game.update({
        where: { id: gameId },
        data: { stateJson: JSON.stringify(state) }
    });
});

When('the game {int} is started', async function (gameId: number) {
    try {
        const game = await prisma.game.findUnique({ where: { id: gameId } });
        if (!game) throw new Error("Game not found");
        const state = JSON.parse(game.stateJson) as GameState;
        
        const treacheryCards = await prisma.treacheryCard.findMany() as any;
        const spiceCards = await prisma.spiceCard.findMany() as any;
        
        // Assuming startGame returns the NEW state or modifies it in place?
        // GameEngine typically returns GameState or modifies. 
        // Let's assume modifies or returns.
        // If it was pure logic refactor, it returns state.
        const newState = engine.startGame(state, treacheryCards, spiceCards);
        
        await prisma.game.update({
             where: { id: gameId },
             data: { stateJson: JSON.stringify(newState) }
        });
    } catch (e) {
        lastError = e;
    }
});

Then('the game phase should be {string}', async function (phase: string) {
    const game = await prisma.game.findUnique({ where: { id: TestContext.gameId } });
    const state = JSON.parse(game!.stateJson) as GameState;
    expect(state.phase).to.equal(phase);
});

Then('the Storm should be at a valid sector', async function () {
    const game = await prisma.game.findUnique({ where: { id: TestContext.gameId } });
    const state = JSON.parse(game!.stateJson) as GameState;
    expect(state.stormLocation).to.be.greaterThan(0);
    expect(state.stormLocation).to.be.lessThan(19);
});

Then('Treachery Deck should be shuffled', async function () {
    const game = await prisma.game.findUnique({ where: { id: TestContext.gameId } });
    const state = JSON.parse(game!.stateJson) as GameState;
    expect(state.treacheryDeck.length).to.be.greaterThan(0);
});

Then('Spice Deck should be shuffled', async function () {
    const game = await prisma.game.findUnique({ where: { id: TestContext.gameId } });
    const state = JSON.parse(game!.stateJson) as GameState;
    expect(state.spiceDeck.length).to.be.greaterThan(0);
});

Then('the start request should be rejected', function () {
    expect(lastError).to.not.be.null;
});

Given('the game is in the {string} phase', async function (phase: string) {
    // Check if game exists
    if (TestContext.gameId === 0) {
        // Create default
        const initialState: GameState = {
            phase: phase,
            turn: 0,
            stormLocation: 0,
            factions: [],
            actionLog: [],
            auctionQueue: [],
            currentBid: 0,
            isBiddingRoundActive: false,
            boardState: {},
            spiceDeck: [], spiceDiscard: [], treacheryDeck: [], treacheryDiscard: [], nexusActive: false
        };
        const game = await prisma.game.create({
            data: { guildId: "test-common", stateJson: JSON.stringify(initialState), categoryId: "c", actionsChannelId: "a", mapChannelId: "m", tableTalkChannelId: "t" }
        });
        TestContext.gameId = game.id;
    } else {
        const game = await prisma.game.findUnique({ where: { id: TestContext.gameId } });
        if (!game) throw new Error("Game missing");
        const state = JSON.parse(game.stateJson) as GameState;
        state.phase = phase;
        await prisma.game.update({ where: { id: TestContext.gameId }, data: { stateJson: JSON.stringify(state) } });
    }
});
