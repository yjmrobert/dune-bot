"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const gamePresenter_1 = require("./gamePresenter");
(0, vitest_1.describe)('GamePresenter', () => {
    (0, vitest_1.it)('should render attack button when ATTACK is a valid action', () => {
        const mockState = {
            phase: 'Battle',
            activePlayer: 'Player 1',
            spice: 10,
            isInCombat: true,
            validActions: ['ATTACK']
        };
        const view = (0, gamePresenter_1.renderGame)(mockState);
        // Verify embed content
        (0, vitest_1.expect)(view.embed?.title).toContain('Player 1');
        (0, vitest_1.expect)(view.embed?.color).toBe('#FF0000'); // Red for combat
        // Verify buttons
        const attackButton = view.buttons.find(b => b.command.type === 'ATTACK');
        (0, vitest_1.expect)(attackButton).toBeDefined();
        (0, vitest_1.expect)(attackButton?.label).toBe('Attack');
        (0, vitest_1.expect)(attackButton?.style).toBe('DANGER');
        (0, vitest_1.expect)(attackButton?.command.target).toBe('p2');
    });
    (0, vitest_1.it)('should render pass button when PASS is a valid action', () => {
        const mockState = {
            phase: 'Movement',
            activePlayer: 'Player 2',
            spice: 5,
            isInCombat: false,
            validActions: ['PASS']
        };
        const view = (0, gamePresenter_1.renderGame)(mockState);
        (0, vitest_1.expect)(view.embed?.color).toBe('#00FF00'); // Green for non-combat
        const passButton = view.buttons.find(b => b.command.type === 'PASS');
        (0, vitest_1.expect)(passButton).toBeDefined();
        (0, vitest_1.expect)(passButton?.label).toBe('Pass');
        (0, vitest_1.expect)(passButton?.style).toBe('SECONDARY');
    });
});
