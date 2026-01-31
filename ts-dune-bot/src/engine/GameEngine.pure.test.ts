import { describe, it, expect } from 'vitest';
import { GameEngine } from './GameEngine';
import { GameState, Faction } from '../types';

describe('GameEngine (Pure Logic)', () => {
    const engine = new GameEngine();

    it('should advance phase purely in memory', () => {
        const initialState: GameState = {
            phase: 'Storm',
            turn: 1,
            stormLocation: 5,
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

        // Act
        const nextState = engine.advancePhase(initialState);

        // Assert
        expect(nextState.phase).toBe('Spice Blow');
        expect(nextState.actionLog).toContain('Phase advanced to: Spice Blow');
    });

    it('should handle bidding logic without any db mocks', () => {
        const state: GameState = {
            phase: 'Bidding',
            turn: 1,
            stormLocation: 5,
            factions: [
                { faction: Faction.Atreides, playerDiscordId: '1', playerName: 'Paul', spice: 10, hand: [], cards: [], leaders: [], traitors: [], reserves: 0, forcesInTanks: 0 } as any,
                { faction: Faction.Harkonnen, playerDiscordId: '2', playerName: 'Baron', spice: 10, hand: [], cards: [], leaders: [], traitors: [], reserves: 0, forcesInTanks: 0 } as any
            ],
            actionLog: [],
            auctionQueue: [],
            currentBid: 0,
            isBiddingRoundActive: true, // Force active round
            currentBidderId: '1',
            currentCard: { name: 'Lasgun', id: 1 } as any,
            spiceDeck: [],
            spiceDiscard: [],
            treacheryDeck: [],
            treacheryDiscard: [],
            nexusActive: false,
            boardState: {}
        };

        // Act: Player 1 Bids 5
        let nextState = engine.handleBid(state, '1', 5);

        // Assert
        expect(nextState.currentBid).toBe(5);
        expect(nextState.highBidderId).toBe('1');
        expect(nextState.currentBidderId).toBe('2'); // Rotated to next player
        expect(nextState.actionLog[0]).toBe('Paul bids 5.');
    });
});
