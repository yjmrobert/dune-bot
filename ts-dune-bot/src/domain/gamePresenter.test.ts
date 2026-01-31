
import { describe, it, expect } from 'vitest';
import { renderGame, GameState } from './gamePresenter';

describe('GamePresenter', () => {
    it('should render attack button when ATTACK is a valid action', () => {
        const mockState: GameState = {
            phase: 'Battle',
            activePlayer: 'Player 1',
            spice: 10,
            isInCombat: true,
            validActions: ['ATTACK']
        };

        const view = renderGame(mockState, ['ATTACK']);

        // Verify embed content
        expect(view.embed?.title).toContain('Player 1');
        expect(view.embed?.color).toBe('#FF0000'); // Red for combat

        // Verify buttons
        const attackButton = view.buttons.find(b => b.command.type === 'attack');
        expect(attackButton).toBeDefined();
        expect(attackButton?.label).toBe('Attack');
        expect(attackButton?.style).toBe('DANGER');
        expect(attackButton?.command.target).toBe('p2');
    });

    it('should render pass button when PASS is a valid action', () => {
        const mockState: GameState = {
            phase: 'Movement',
            activePlayer: 'Player 2',
            spice: 5,
            isInCombat: false,
            validActions: ['PASS']
        };

        const view = renderGame(mockState, ['PASS']);

        expect(view.embed?.color).toBe('#00FF00'); // Green for non-combat

        const passButton = view.buttons.find(b => b.command.type === 'pass');
        expect(passButton).toBeDefined();
        expect(passButton?.label).toBe('Pass');
        expect(passButton?.style).toBe('SECONDARY');
    });
});

