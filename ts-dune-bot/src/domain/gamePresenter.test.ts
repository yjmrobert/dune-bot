
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

    it('should render PLAYER_ACTIONS button', () => {
        const mockState: GameState = {
            phase: 'Storm',
            turn: 1,
            stormLocation: 0,
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

        const view = renderGame(mockState, ['PLAYER_ACTIONS'], 1);

        const playerActionsButton = view.buttons.find(b => b.command.type === 'player-actions');
        expect(playerActionsButton).toBeDefined();
        expect(playerActionsButton?.label).toBe('My Actions');
        expect(playerActionsButton?.style).toBe('SECONDARY');
    });

    it('should render MOVE_STORM button', () => {
        const mockState: GameState = {
            phase: 'Storm',
            turn: 1,
            stormLocation: 0,
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

        const view = renderGame(mockState, ['MOVE_STORM'], 1);

        const moveStormButton = view.buttons.find(b => b.command.type === 'move-storm');
        expect(moveStormButton).toBeDefined();
        expect(moveStormButton?.label).toBe('Move Storm');
        expect(moveStormButton?.style).toBe('PRIMARY');
    });

    it('should render SPICE_BLOW button', () => {
        const mockState: GameState = {
            phase: 'Spice Blow',
            turn: 1,
            stormLocation: 0,
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

        const view = renderGame(mockState, ['SPICE_BLOW'], 1);

        const spiceBlowButton = view.buttons.find(b => b.command.type === 'spice-blow');
        expect(spiceBlowButton).toBeDefined();
        expect(spiceBlowButton?.label).toBe('Reveal Spice Blow');
        expect(spiceBlowButton?.style).toBe('PRIMARY');
    });

    it('should render COLLECT_SPICE button', () => {
        const mockState: GameState = {
            phase: 'Spice Collection',
            turn: 1,
            stormLocation: 0,
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

        const view = renderGame(mockState, ['COLLECT_SPICE'], 1);

        const collectSpiceButton = view.buttons.find(b => b.command.type === 'collect-spice');
        expect(collectSpiceButton).toBeDefined();
        expect(collectSpiceButton?.label).toBe('Collect Spice');
        expect(collectSpiceButton?.style).toBe('SUCCESS');
    });

    it('should render MENTAT_PAUSE button', () => {
        const mockState: GameState = {
            phase: 'Mentat Pause',
            turn: 1,
            stormLocation: 0,
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

        const view = renderGame(mockState, ['MENTAT_PAUSE'], 1);

        const mentatPauseButton = view.buttons.find(b => b.command.type === 'mentat-pause');
        expect(mentatPauseButton).toBeDefined();
        expect(mentatPauseButton?.label).toBe('Mentat Pause');
        expect(mentatPauseButton?.style).toBe('SECONDARY');
    });

    it('should render REVEAL_PLAN button', () => {
        const mockState: GameState = {
            phase: 'Battle',
            turn: 1,
            stormLocation: 0,
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

        const view = renderGame(mockState, ['REVEAL_PLAN'], 1);

        const revealPlanButton = view.buttons.find(b => b.command.type === 'reveal-plan');
        expect(revealPlanButton).toBeDefined();
        expect(revealPlanButton?.label).toBe('Reveal Battle Plan');
        expect(revealPlanButton?.style).toBe('DANGER');
    });
});
