import { describe, it, expect } from 'vitest';
import { GameEngine } from './GameEngine';
import { GameState, Faction } from '../types';

describe('Setup Phase & Traitor Selection', () => {
    const engine = new GameEngine();

    const createInitialState = (): GameState => ({
        phase: 'Setup',
        turn: 0,
        stormLocation: 0,
        factions: [
            { faction: Faction.Atreides, playerDiscordId: '1', playerName: 'Paul', spice: 0, hand: [], leaders: [], traitors: [], reserves: 0, forcesInTanks: 0 } as any,
            { faction: Faction.Harkonnen, playerDiscordId: '2', playerName: 'Baron', spice: 0, hand: [], leaders: [], traitors: [], reserves: 0, forcesInTanks: 0 } as any
        ],
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
    });

    it('startGame should transition to Setup_TraitorPick and deal options', () => {
        const state = createInitialState();
        const treacheryCards = [
            { name: 'T1', id: 1 }, { name: 'T2', id: 2 }, { name: 'T3', id: 3 }, { name: 'T4', id: 4 },
            { name: 'T5', id: 5 }, { name: 'T6', id: 6 }, { name: 'T7', id: 7 }, { name: 'T8', id: 8 }
        ] as any[]; // Mock cards

        const newState = engine.startGame(state, treacheryCards, []);

        expect(newState.phase).toBe('Setup_TraitorPick');
        expect(newState.pendingPlayerIds).toEqual(['1', '2']);
        
        const atreides = newState.factions.find(f => f.faction === Faction.Atreides);
        expect(atreides?.traitorOptions).toHaveLength(4);
        expect(atreides?.traitors).toHaveLength(0);
    });

    it('confirmTraitor should update choice and remove from pending', () => {
        const state = createInitialState();
        // Manually setup state to emulate post-startGame
        state.phase = 'Setup_TraitorPick';
        state.pendingPlayerIds = ['1', '2'];
        state.factions[0].traitorOptions = ['T1', 'T2', 'T3', 'T4'];
        state.factions[1].traitorOptions = ['T5', 'T6', 'T7', 'T8'];

        // Act: Player 1 confirms T1
        const s1 = engine.confirmTraitor(state, '1', 'T1');

        expect(s1.factions[0].traitors).toEqual(['T1']);
        expect(s1.factions[0].traitorOptions).toEqual([]);
        expect(s1.pendingPlayerIds).toEqual(['2']);
        expect(s1.phase).toBe('Setup_TraitorPick'); // Still waiting for P2
    });

    it('confirmTraitor should advance to Storm when last player confirms', () => {
        const state = createInitialState();
        state.phase = 'Setup_TraitorPick';
        state.pendingPlayerIds = ['2']; // Only P2 left
        state.factions[0].traitors = ['T1'];
        state.factions[1].traitorOptions = ['T5', 'T6', 'T7', 'T8'];

        // Act: Player 2 confirms T5
        const s2 = engine.confirmTraitor(state, '2', 'T5');

        expect(s2.factions[1].traitors).toEqual(['T5']);
        expect(s2.pendingPlayerIds).toEqual([]); // Empty
        expect(s2.phase).toBe('Storm');
    });
});
