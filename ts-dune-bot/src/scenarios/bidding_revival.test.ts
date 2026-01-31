
import { describe, it, expect } from 'vitest';
import { GameEngine } from '../engine/GameEngine';
import { ScenarioRunner } from './ScenarioRunner';
import { Faction } from '../types';

describe('Scenario: Bidding', () => {
    const engine = new GameEngine();

    it('bidding_auction_flow: Simple bid sequence', () => {
        const runner = new ScenarioRunner()
            .withPhase("Bidding")
            .withFaction(Faction.Atreides, "A", 10)
            .withFaction(Faction.Harkonnen, "B", 10);

        let state = runner.build();
        const pA = runner.getFactionId(Faction.Atreides);
        const pB = runner.getFactionId(Faction.Harkonnen);

        // Manually setup auction for test
        state.isBiddingRoundActive = true;
        state.currentBidderId = pA;
        state.auctionInitialBidderId = pA;
        state.currentCard = { name: "Lasgun", id: 1 } as any;
        state.factions.forEach(f => f.hand = []); // ensure empty hands

        // A bids 1
        state = engine.handleBid(state, pA, 1);
        expect(state.currentBid).toBe(1);
        expect(state.highBidderId).toBe(pA);
        expect(state.currentBidderId).toBe(pB); // Rotated

        // B bids 2
        state = engine.handleBid(state, pB, 2);
        expect(state.currentBid).toBe(2);
        expect(state.highBidderId).toBe(pB);
        expect(state.currentBidderId).toBe(pA); // Rotated back

        // A passes
        state = engine.handlePass(state, pA);

        // Should resolve to B (High Bidder)
        // Logic depends on `passBid` checking resolution
        // If A passes, and B is high bidder, auction ends for this card.

        // Note: Implementation in BiddingEngine might auto-start next auction.
        // For this test, we check if B got the card.
        const winner = state.factions.find(f => f.faction === Faction.Harkonnen)!;
        expect(winner.hand.some(c => c.name === "Lasgun")).toBe(true);
        expect(winner.spice).toBe(8); // 10 - 2
    });
});

describe('Scenario: Revival', () => {
    const engine = new GameEngine();

    it('revival_limits: Free and Paid', () => {
        const runner = new ScenarioRunner()
            .withPhase("Revival")
            .withFaction(Faction.Atreides, "Paul", 10)
            .withFaction(Faction.Guild, "Edric", 10);

        let state = runner.build();
        const atreides = state.factions.find(f => f.faction === Faction.Atreides)!;
        const guild = state.factions.find(f => f.faction === Faction.Guild)!;

        // Setup Tanks
        atreides.forcesInTanks = 5;
        guild.forcesInTanks = 5;

        // Atreides revives 3 (2 Free + 1 Paid)
        state = engine.reviveForces(state, atreides.playerDiscordId, 3);

        // Guild revives 2 (1 Free + 1 Paid)
        state = engine.reviveForces(state, guild.playerDiscordId, 2);

        // Assertions
        const aFinal = state.factions.find(f => f.faction === Faction.Atreides)!;
        const gFinal = state.factions.find(f => f.faction === Faction.Guild)!;

        // Atreides: Cost = (3-2)*2 = 2. Spice 10->8. Tanks 5->2.
        expect(aFinal.spice).toBe(8);
        expect(aFinal.forcesInTanks).toBe(2);

        // Guild: Cost = (2-1)*2 = 2. Spice 10->8. Tanks 5->3.
        expect(gFinal.spice).toBe(8);
        expect(gFinal.forcesInTanks).toBe(3);
    });
});
