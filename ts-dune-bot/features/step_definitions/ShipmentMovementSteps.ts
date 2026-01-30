import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from 'chai';
import { GameEngine } from '../../src/engine/GameEngine';
import { prisma } from '../../src/db';
import { GameState, Faction, FactionState } from '../../src/types';
import { TestContext } from '../support/TestContext';
import { BOARD_MAP } from '../../src/constants/map';


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

// Duplicate step removed. Using GameSetupSteps generic version.

Given('faction {string} exists with {int} spice and {int} reserves', async function (factionName: string, spice: number, reserves: number) {
    const state = await getState(TestContext.gameId);
    let faction = state.factions.find(f => f.faction === factionName);
    if (!faction) {
        faction = {
            faction: factionName as Faction,
            playerDiscordId: `d-${factionName}`,
            playerName: factionName,
            spice: spice,
            reserves: reserves,
            forcesInTanks: 0,
            leaders: [],
            traitors: [],
            hand: []
        };
        state.factions.push(faction);
    } else {
        faction.spice = spice;
        faction.reserves = reserves;
    }
    await saveState(TestContext.gameId, state);
});

Given('{string} is a Stronghold', function (name: string) {
    // Verified by code constants, just ensuring test expectation matches reality
    const t = BOARD_MAP[name];
    if (!t || !t.isStronghold) throw new Error(`${name} is likely not a stronghold in map constants.`);
});

Given('{string} is not a Stronghold', function (name: string) {
    const t = BOARD_MAP[name];
    if (t && t.isStronghold) throw new Error(`${name} shouldn't be a stronghold.`);
});

// Explicitly setting sector for test scenario matching
Given('the storm is at sector {int}', async function (sector: number) {
    const state = await getState(TestContext.gameId);
    state.stormLocation = sector;
    await saveState(TestContext.gameId, state);
});

Given('the storm is at sector {int} \\(Blocking Shield Wall)', async function (sector: number) {
    const state = await getState(TestContext.gameId);
    state.stormLocation = sector;
    await saveState(TestContext.gameId, state);
});

Given('{string} occupies sector {int}', function (name: string, sector: number) {
    const t = BOARD_MAP[name];
    if (!t) throw new Error("Map error");
    if (!t.sectors.includes(sector)) throw new Error(`Map constant mismatch: ${name} does not have sector ${sector}`);
});

When('{string} ships {int} forces to {string}', async function (factionName: string, count: number, territoryName: string) {
    const t = BOARD_MAP[territoryName];
    // Default sector: First one
    const sector = t.sectors[0];
    try {
        await engine.shipForces(TestContext.gameId, `d-${factionName}`, territoryName, sector, count);
    } catch (e: any) {
        TestContext.lastError = e;
    }
});

When('{string} ships {int} forces to {string} \\(Sector {int})', async function (factionName: string, count: number, territoryName: string, sector: number) {
    try {
        await engine.shipForces(TestContext.gameId, `d-${factionName}`, territoryName, sector, count);
    } catch (e: any) {
        TestContext.lastError = e;
    }
});

Then('{string} should have {int} {string} forces', async function (territoryName: string, count: number, factionName: string) {
    const state = await getState(TestContext.gameId);
    const actual = state.boardState[territoryName]?.forces[factionName] || 0;
    expect(actual).to.equal(count);
});

// {string} has {int} forces in {string} MATCHES STEPS IN SPICEBLOWSTEPS
// Removing duplicate here to use the existing one.
// However, I need to make sure the implementation is compatible. 
// SpiceBlowSteps version: 
// Given('{string} has {int} forces in {string}', async function (faction: string, count: number, tName: string) { ... }
// It creates boardState entry.
// My version: Also creates faction if missing.
// The SpiceBlowSteps one MIGHT fail if faction doesn't exist in FactionState list?
// Let's check SpiceBlowSteps.ts content. 
// Step Id 281: SpiceBlowSteps code does NOT create faction. It only updates boardState.
// Use the View File to double check.


Given('{string} is adjacent to {string}', function (t1: string, t2: string) {
    const mapT1 = BOARD_MAP[t1];
    if (!mapT1.neighbors.includes(t2)) throw new Error(`Map definition missing adjacency: ${t1} -> ${t2}`);
});

Given('{string} controls {string}', async function (factionName: string, territoryName: string) {
    const state = await getState(TestContext.gameId);
    if (!state.boardState[territoryName]) state.boardState[territoryName] = { name: territoryName, spice: 0, forces: {} };
    state.boardState[territoryName].forces[factionName] = 1; // Just ensures presence
    await saveState(TestContext.gameId, state);
});

Given('{string} does not control {string} or {string}', async function (factionName: string, t1: string, t2: string) {
    const state = await getState(TestContext.gameId);
    if (state.boardState[t1]) delete state.boardState[t1].forces[factionName];
    if (state.boardState[t2]) delete state.boardState[t2].forces[factionName];
    await saveState(TestContext.gameId, state);
});

When('{string} moves {int} force(s) from {string} to {string}', async function (factionName: string, count: number, from: string, to: string) {
    try {
        await engine.moveForces(TestContext.gameId, `d-${factionName}`, from, to, count);
    } catch (e: any) {
        TestContext.lastError = e;
    }
});

// Duplicate step removed. Using BiddingSteps generic version.
