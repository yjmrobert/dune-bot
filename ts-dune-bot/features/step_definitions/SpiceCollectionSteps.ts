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

// Given "Atreides" has 5 forces in "Hagga Basin" -> Matches SpiceBlowSteps
// Given "Hagga Basin" has 20 Spice -> Matches SpiceBlowSteps ("territory {string} has {int} spice")? 
// SpiceBlowSteps: Given('territory {string} has {int} spice'...)
// Feature says: "Hagga Basin" has 20 Spice. No "territory" prefix.
// So I need to define it.

Given('{string} has {int} Spice', async function (territoryName: string, amount: number) {
    const state = await getState(TestContext.gameId);
    if (!state.boardState[territoryName]) {
        state.boardState[territoryName] = { name: territoryName, spice: 0, forces: {} };
    }
    state.boardState[territoryName].spice = amount;
    await prisma.game.update({ where: { id: TestContext.gameId }, data: { stateJson: JSON.stringify(state) } });
});

// Given "Atreides" controls "Arrakeen" -> Matches ShipmentMovementSteps.ts

When('spice collection is resolved', async function () {
    await engine.resolveSpiceCollection(TestContext.gameId);
});


