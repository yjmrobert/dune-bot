import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from 'chai';
import { GameEngine } from '../../src/engine/GameEngine';
import { prisma } from '../../src/db';
import { GameState } from '../../src/types';
import { TestContext } from '../support/TestContext';

const engine = new GameEngine();

async function getState(gameId: number): Promise<GameState> {
    const game = await prisma.game.findUnique({ where: { id: gameId } });
    if (!game) throw new Error("Game not found");
    return JSON.parse(game.stateJson) as GameState;
}

async function saveState(gameId: number, state: GameState) {
    await prisma.game.update({ where: { id: gameId }, data: { stateJson: JSON.stringify(state) } });
}

// Given "Atreides" controls "Arrakeen" matches duplicate step in ShipmentMovementSteps
// However, I should check if I need to implement it if it doesn't match EXACTLY.
// ShipmentMovementSteps: Given('{string} controls {string}', ...)
// This should match.

When('the Mentat Pause is resolved', async function () {
    await engine.resolveMentatPause(TestContext.gameId);
});

Then('the game should be in Turn {int}', async function (turn: number) {
    const state = await getState(TestContext.gameId);
    expect(state.turn).to.equal(turn);
});

Then('the phase should be {string}', async function (phase: string) {
    const state = await getState(TestContext.gameId);
    expect(state.phase).to.equal(phase);
});

Then('{string} should be declared the winner', async function (factionName: string) {
    const state = await getState(TestContext.gameId);
    expect(state.winnerId).to.equal(factionName);
});

Then('the game should be ended', async function () {
    const state = await getState(TestContext.gameId);
    expect(state.phase).to.equal("Game Over");
});
