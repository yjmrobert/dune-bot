import { Given, When, Then, Before } from '@cucumber/cucumber';
import { expect } from 'chai';
import { GameEngine } from '../../src/engine/GameEngine';
import { prisma } from '../../src/db';
import { GameState, FactionState, Faction, TreacheryCard } from '../../src/types';
import { TestContext } from '../support/TestContext';
import { BiddingEngine } from '../../src/engine/BiddingEngine';

const engine = new BiddingEngine();
const gameEngine = new GameEngine();
let lastError: any = null;

Before(() => {
    // No-op, managed by GameSetupSteps OR TestContext
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

Given('a game with {int} factions: {string}, {string}, {string}, {string}', async function (count: number, f1: string, f2: string, f3: string, f4: string) {
    if (TestContext.gameId === 0) {
        // Create basic game if not exists
        const initialState: GameState = {
            phase: "Setup", turn: 0, stormLocation: 0, factions: [], actionLog: [],
            auctionQueue: [], currentBid: 0, isBiddingRoundActive: false, boardState: {},
            spiceDeck: [], spiceDiscard: [], treacheryDeck: [], treacheryDiscard: [], nexusActive: false
        };
        const game = await prisma.game.create({
            data: { guildId: "test-bidding", stateJson: JSON.stringify(initialState), categoryId: "c", actionsChannelId: "a", mapChannelId: "m", tableTalkChannelId: "t" }
        });
        TestContext.gameId = game.id;
    }
    const state = await getState(TestContext.gameId);

    const factionsList = [f1, f2, f3, f4];
    state.factions = []; // Clear existing factions if any

    for (const f of factionsList) {
        state.factions.push({
            faction: f as Faction,
            playerDiscordId: `d-${f}`,
            playerName: f,
            spice: 10,
            reserves: 0,
            forcesInTanks: 0,
            leaders: [],
            traitors: [],
            hand: []
        });
    }

    // We also need to set the phase to Bidding to avoid the other generic step overriding? 
    // Actually the generic step handles "Given the game is in 'Bidding' phase"
    // But this step sets factions.

    // We already removed the duplicate "Before" or specific phase step.

    await saveState(TestContext.gameId, state);
});

Given('{string} has {int} Treachery Card(s)', async function (factionName: string, count: number) {
    const state = await getState(TestContext.gameId);
    const faction = state.factions.find(f => f.faction === factionName);
    if (!faction) throw new Error("Faction not found");

    faction.hand = [];
    for (let i = 0; i < count; i++) {
        faction.hand.push({ id: i, name: `Card ${i}`, type: "Weapon", description: "desc", isWeapon: true, isDefense: false, isSpecial: false });
    }
    await saveState(TestContext.gameId, state);
});

When('the Bidding Phase starts', async function () {
    // Populate Deck logic is inside advancePhase -> StartBiddingPhase
    // We need to ensure deck exists in DB
    const cards: TreacheryCard[] = [];
    for (let i = 0; i < 10; i++) {
        cards.push({ id: i, name: `Treachery Card ${i}`, type: "Weapon", description: "desc", isWeapon: true, isDefense: false, isSpecial: false });
    }
    // Mock DB deck or ensure seed was run? Seed was run.
    // But we are in test db. So we might need to seed test db or mocking via manual injection if we could.
    // GameEngine.advancePhase calls prisma.treacheryCard.findMany().
    // So we need to seed the DB.

    // Check if cards exist
    const count = await prisma.treacheryCard.count();
    if (count === 0) {
        await prisma.treacheryCard.createMany({ data: cards });
    }

    try {
        // We force current phase to be "Spice Blow" so advance goes to Bidding
        const state = await getState(TestContext.gameId);
        state.phase = "Spice Blow";
        await saveState(TestContext.gameId, state);

        await gameEngine.advancePhase(TestContext.gameId);
    } catch (e) {
        lastError = e;
    }
});

Then('{int} cards should be dealt for auction', async function (count: number) {
    const state = await getState(TestContext.gameId);
    const total = state.auctionQueue.length + (state.currentCard ? 1 : 0);
    expect(total).to.equal(count);
});


Then('{string} should not be eligible to bid', async function (factionName: string) {
    const state = await getState(TestContext.gameId);
    // If they are not eligible, they should not be the current bidder
    const faction = state.factions.find(f => f.faction === factionName);
    // Also, strictly speaking, the engine shouldn't pick them.
    // If the phase started, currentBidderId should be someone else.
    expect(state.currentBidderId).to.not.equal(faction?.playerDiscordId);
});

Then('{string} should be eligible to bid', async function (factionName: string) {
    // If they are eligible and it's their turn (or they are in queue), 
    // in the specific scenario where only one is eligible, they MUST be the current bidder.
    const state = await getState(TestContext.gameId);
    const faction = state.factions.find(f => f.faction === factionName);
    expect(state.currentBidderId).to.equal(faction?.playerDiscordId);
});

Then('{string} should win the auction', async function (factionName: string) {
    const state = await getState(TestContext.gameId);
    const found = state.actionLog.some(log => log.includes(`${factionName} won`));
    expect(found).to.be.true;
});

Given('there are {int} cards up for auction', async function (count: number) {
    const state = await getState(TestContext.gameId);
    state.auctionQueue = [];
    for (let i = 1; i <= count; i++) {
        state.auctionQueue.push({ id: i, name: `Card ${i}`, type: "Weapon", description: "desc", isWeapon: true, isDefense: false, isSpecial: false });
    }
    await saveState(TestContext.gameId, state);
});

Then('card {int} should be sold', async function (cardId: number) {
    const state = await getState(TestContext.gameId);
    // Card should not be in queue and not be current card (if auction ended)
    const inQueue = state.auctionQueue.find(c => c.id === cardId);
    const isCurrent = state.currentCard?.id === cardId;
    expect(inQueue).to.be.undefined;
    expect(isCurrent).to.be.false;
});

Given('{string} is second', async function (factionName: string) {
    const state = await getState(TestContext.gameId);
    expect(state.factions[1].faction).to.equal(factionName);
});

Given('{string} is third', async function (factionName: string) {
    const state = await getState(TestContext.gameId);
    expect(state.factions[2].faction).to.equal(factionName);
});

Given('{string} is fourth', async function (factionName: string) {
    const state = await getState(TestContext.gameId);
    expect(state.factions[3].faction).to.equal(factionName);
});


Given('{string} is the First Player', async function (factionName: string) {
    const state = await getState(TestContext.gameId);
    state.firstPlayerId = `discord-${factionName}`;
    await saveState(TestContext.gameId, state);
});

Given('{string} is first', async function (factionName: string) {
    const state = await getState(TestContext.gameId);
    state.firstPlayerId = `discord-${factionName}`;
    state.factions.forEach(f => f.hand = []);
    await saveState(TestContext.gameId, state);
});

Given('all players have {int} Treachery Cards', async function (count: number) {
    const state = await getState(TestContext.gameId);
    state.factions.forEach(f => {
        f.hand = [];
        for (let i = 0; i < count; i++) f.hand.push({} as any);
    });
    await saveState(TestContext.gameId, state);
});

Then('it should be {string} turn to bid', async function (factionName: string) {
    const state = await getState(TestContext.gameId);
    const faction = state.factions.find(f => f.playerDiscordId === state.currentBidderId);
    expect(faction?.faction).to.equal(factionName);
});

Given('the current bid is {int}', async function (amount: number) {
    const state = await getState(TestContext.gameId);
    state.currentBid = amount;
    await saveState(TestContext.gameId, state);
});

When('{string} places a bid of {int}', async function (factionName: string, amount: number) {
    const state = await getState(TestContext.gameId);
    try {
        await gameEngine.handleBid(TestContext.gameId, `d-${factionName}`, amount);
    } catch (e) {
        lastError = e;
    }
});

Then('the bid should be rejected', function () {
    expect(lastError).to.not.be.null;
    lastError = null;
});

Given('{string} has {int} spice', async function (factionName: string, amount: number) {
    const state = await getState(TestContext.gameId);
    const faction = state.factions.find(f => f.faction === factionName);
    if (faction) faction.spice = amount;
    await saveState(TestContext.gameId, state);
});

Then('the current bid should be {int}', async function (amount: number) {
    const state = await getState(TestContext.gameId);
    expect(state.currentBid).to.equal(amount);
});

Then('the high bidder should be {string}', async function (factionName: string) {
    const state = await getState(TestContext.gameId);
    const faction = state.factions.find(f => f.playerDiscordId === state.highBidderId);
    expect(faction?.faction).to.equal(factionName);
});

When('{string} passes', async function (factionName: string) {
    try {
        await gameEngine.handlePass(TestContext.gameId, `d-${factionName}`);
    } catch (e) {
        lastError = e;
    }
});

Then('{string} should have {int} spice', async function (factionName: string, amount: number) {
    const state = await getState(TestContext.gameId);
    const faction = state.factions.find(f => f.faction === factionName);
    expect(faction?.spice).to.equal(amount);
});

Then('{string} should have {int} Treachery Cards', async function (factionName: string, count: number) {
    const state = await getState(TestContext.gameId);
    const faction = state.factions.find(f => f.faction === factionName);
    expect(faction?.hand.length).to.equal(count);
});
