
import { describe, it, expect } from 'vitest';
import { renderGame } from './gamePresenter';
import { GameState } from '../types';

describe('GamePresenter', () => {
    it('should render attack button when ATTACK is a valid action', () => {
        const mockState: GameState = {
            phase: 'Battle',
            turn: 1,
            stormLocation: 5,
            factions: [{ faction: 'Atreides', playerDiscordId: 'p1', playerName: 'Leto' }] as any,
            firstPlayerId: 'p1',
            battleState: { resolved: false } as any, // Mock battle
            actionLog: [],
            spiceDeck: [],
            spiceDiscard: [],
            treacheryDeck: [],
            treacheryDiscard: [],
            auctionQueue: [],
            currentBid: 0,
            isBiddingRoundActive: false,
            nexusActive: false,
            boardState: {}
        };

        const view = renderGame(mockState, ['ATTACK'], 123);

        // Verify embed content
        expect(view.embed?.color).toBe('#FF0000'); // Red for combat
        expect(view.embed?.fields?.find(f => f.name === 'First Player')?.value).toContain('Atreides');

        // Verify buttons
        const attackButton = view.buttons.find(b => b.command.type === 'attack');
        expect(attackButton).toBeDefined();
        expect(attackButton?.label).toBe('Attack');
        expect(attackButton?.style).toBe('DANGER');
        // Target is mocked to p2 in renderer for now
    });

    it('should render pass button when PASS is a valid action', () => {
        const mockState: GameState = {
            phase: 'Movement',
            turn: 1,
            stormLocation: 5,
            factions: [],
            actionLog: [],
            spiceDeck: [],
            spiceDiscard: [],
            treacheryDeck: [],
            treacheryDiscard: [],
            auctionQueue: [],
            currentBid: 0,
            isBiddingRoundActive: false,
            nexusActive: false,
            boardState: {}
        };

        const view = renderGame(mockState, ['PASS'], 999);

        expect(view.embed?.color).toBe('#00FF00'); // Green for non-combat

        const passButton = view.buttons.find(b => b.command.type === 'pass');
        expect(passButton).toBeDefined();
        expect(passButton?.label).toBe('Pass');
        expect(passButton?.style).toBe('SECONDARY');
        expect(passButton?.command.target).toBe('999');
    });
});


