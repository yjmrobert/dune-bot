import { describe, test, expect, beforeEach } from 'vitest';
import { GameEngine } from './GameEngine';
import { GameState, Faction } from '../types';

describe('GameEngine Phase Handler Check', () => {
    let engine: GameEngine;
    let mockState: GameState;

    beforeEach(() => {
        engine = new GameEngine();
        mockState = {
            phase: 'Setup_TraitorPick',
            turn: 1,
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
            boardState: {},
            wizardState: {},
            readyPlayerIds: []
        };
    });

    test('should return PICK_TRAITOR action for Setup_TraitorPick phase', () => {
        const actions = engine.getAvailableActions(mockState);
        expect(actions).toContain('PICK_TRAITOR');
        expect(actions).not.toContain('MOVE_STORM');
    });

    test('should return MOVE_STORM action for Storm phase', () => {
        mockState.phase = 'Storm';
        const actions = engine.getAvailableActions(mockState);
        expect(actions).toContain('MOVE_STORM');
    });
});
