"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BiddingEngine = void 0;
const types_1 = require("../types");
// Helper to get next item in circular array
function nextItem(arr, currentItem) {
    const idx = arr.indexOf(currentItem);
    if (idx === -1)
        return arr[0];
    return arr[(idx + 1) % arr.length];
}
class BiddingEngine {
    startBiddingPhase(state, deck) {
        // 1. Identify eligible players (Hand < 4)
        const eligiblePlayers = state.factions.filter(f => f.hand.length < 4);
        if (eligiblePlayers.length === 0) {
            state.actionLog.push("Bidding: No players eligible to bid.");
            // Phase ends immediately or handle transition? 
            // For now, let's keep it simple: If no one can bid, we probably should skip.
            // But usually we set state and let engine move it.
            return;
        }
        // 2. Deal Cards to Auction Queue
        state.auctionQueue = [];
        for (let i = 0; i < eligiblePlayers.length; i++) {
            const card = deck.shift(); // Draw from top
            if (card) {
                state.auctionQueue.push(card);
            }
        }
        if (state.auctionQueue.length === 0) {
            state.actionLog.push("Bidding: No cards in deck.");
            return;
        }
        state.actionLog.push(`Bidding Phase Started. ${state.auctionQueue.length} cards up for auction.`);
        this.startNextAuction(state);
    }
    startNextAuction(state) {
        if (state.auctionQueue.length === 0) {
            this.endBiddingPhase(state);
            return;
        }
        // Pop card
        const card = state.auctionQueue.shift();
        if (!card)
            return;
        state.currentCard = card;
        state.currentBid = 0;
        state.highBidderId = undefined;
        state.isBiddingRoundActive = true;
        // Determine Starter
        let starterId;
        if (!state.auctionInitialBidderId) {
            // First card: Start with First Player
            // For MVP, if we don't have firstPlayerId, pick first in array
            // Ideally GameState should have a "FirstPlayer" concept tracked from Storm
            const firstFaction = state.factions.find(f => f.playerDiscordId === state.firstPlayerId) || state.factions[0];
            starterId = this.getFirstEligibleBidder(state, firstFaction.playerDiscordId);
        }
        else {
            // Rotate
            starterId = this.getNextEligibleBidder(state, state.auctionInitialBidderId);
        }
        state.auctionInitialBidderId = starterId;
        state.currentBidderId = starterId;
        const starter = state.factions.find(f => f.playerDiscordId === starterId);
        state.actionLog.push(`Item up for bid: ${card.name}. Bidding starts with ${starter?.playerName}.`);
    }
    placeBid(state, userId, amount) {
        if (state.phase !== "Bidding" || !state.isBiddingRoundActive)
            throw new Error("Not int bidding phase.");
        if (state.currentBidderId !== userId)
            throw new Error("Not your turn to bid.");
        const faction = state.factions.find(f => f.playerDiscordId === userId);
        if (!faction)
            throw new Error("Player not found.");
        if (faction.hand.length >= 4)
            throw new Error("You have 4 cards and must pass.");
        if (amount <= state.currentBid)
            throw new Error(`Bid must be higher than ${state.currentBid}.`);
        if (amount > faction.spice)
            throw new Error(`Not enough spice. You have ${faction.spice}.`);
        state.currentBid = amount;
        state.highBidderId = userId;
        state.actionLog.push(`${faction.playerName} bids ${amount}.`);
        this.advanceBidder(state);
    }
    passBid(state, userId) {
        if (state.currentBidderId !== userId)
            throw new Error("Not your turn.");
        const faction = state.factions.find(f => f.playerDiscordId === userId);
        state.actionLog.push(`${faction?.playerName} passed.`);
        this.advanceBidder(state);
        // Check Resolution
        if (state.highBidderId && state.currentBidderId === state.highBidderId) {
            // Rotated back to high bidder
            this.resolveAuctionWin(state);
        }
        else if (!state.highBidderId && this.checkIfEveryonePassed(state)) {
            // Everyone passed, wrap around logic needs improvement but simplified:
            // If currentBidder is the InitialBidder again and NO high bidder, then everyone passed.
            if (state.currentBidderId === state.auctionInitialBidderId) {
                state.actionLog.push(`All players passed on ${state.currentCard?.name}. Returning to deck.`);
                // Return to deck (MVP: Just ignore logic for "insert at 0")
                this.startNextAuction(state);
            }
        }
    }
    advanceBidder(state) {
        if (!state.currentBidderId)
            return;
        state.currentBidderId = this.getNextEligibleBidder(state, state.currentBidderId);
    }
    getNextEligibleBidder(state, currentId) {
        const ids = state.factions.map(f => f.playerDiscordId);
        const currentIdx = ids.indexOf(currentId);
        if (currentIdx === -1)
            return currentId;
        for (let i = 1; i <= ids.length; i++) {
            const nextIdx = (currentIdx + i) % ids.length;
            const nextFaction = state.factions[nextIdx];
            // Check eligibility? Rules say even if hand full, they are part of rotation but must pass. 
            // So we just return next player.
            // BiddingService.cs says: "Players with full hand... must pass."
            return nextFaction.playerDiscordId;
        }
        return currentId;
    }
    getFirstEligibleBidder(state, startId) {
        const ids = state.factions.map(f => f.playerDiscordId);
        let idx = ids.indexOf(startId);
        if (idx === -1)
            idx = 0;
        for (let i = 0; i < ids.length; i++) {
            const f = state.factions[(idx + i) % ids.length];
            if (f.hand.length < 4)
                return f.playerDiscordId;
        }
        return startId;
    }
    // Check if everyone passed is implied by rotation back to start without high bidder
    checkIfEveryonePassed(state) {
        // This logic is handled in passBid by checking if current == initial
        return true;
    }
    resolveAuctionWin(state) {
        if (!state.highBidderId || !state.currentCard)
            return;
        const winner = state.factions.find(f => f.playerDiscordId === state.highBidderId);
        if (!winner)
            return;
        const cost = state.currentBid;
        winner.spice -= cost;
        winner.hand.push(state.currentCard);
        // Emperor Pay
        if (winner.faction !== types_1.Faction.Emperor) {
            const emperor = state.factions.find(f => f.faction === types_1.Faction.Emperor);
            if (emperor) {
                emperor.spice += cost;
                state.actionLog.push(`Emperor gains ${cost} spice.`);
            }
        }
        state.actionLog.push(`${winner.playerName} won ${state.currentCard.name} for ${cost} spice.`);
        this.startNextAuction(state);
    }
    endBiddingPhase(state) {
        state.isBiddingRoundActive = false;
        state.currentCard = undefined;
        state.currentBid = 0;
        state.highBidderId = undefined;
        state.actionLog.push("Bidding Phase Ended.");
    }
}
exports.BiddingEngine = BiddingEngine;
