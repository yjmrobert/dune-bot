
import { GameEngine } from './src/engine/GameEngine';
import { GameState, Faction, TreacheryCard } from './src/types';

async function testBiddingPhase() {
    console.log("--- Starting Simulation: Bidding Phase ---");

    const engine = new GameEngine();
    
    // 1. Setup State: Bidding Phase logic needs to be triggered via advancePhase usually, or specific call.
    // Let's use advancePhase from "CHOAM Charity".
    
    let state: GameState = {
        phase: "CHOAM Charity",
        turn: 2,
        stormLocation: 10,
        factions: [
            { faction: Faction.Atreides, playerDiscordId: "p1", playerName: "P1", spice: 10, reserves: 0, forcesInTanks: 0, leaders: [], traitors: [], hand: [] }, // Eligible
            { faction: Faction.Harkonnen, playerDiscordId: "p2", playerName: "P2", spice: 10, reserves: 0, forcesInTanks: 0, leaders: [], traitors: [], hand: [] }  // Eligible
        ],
        actionLog: [],
        auctionQueue: [],
        currentBid: 0,
        isBiddingRoundActive: false,
        spiceDeck: [],
        spiceDiscard: [],
        treacheryDeck: [
            { id: 1, name: "Lasgun", type: "Weapon", description: "Kill", isWeapon: true, isDefense: false, isSpecial: false },
            { id: 2, name: "Shield", type: "Defense", description: "Save", isWeapon: false, isDefense: true, isSpecial: false }
        ] as TreacheryCard[],
        treacheryDiscard: [],
        nexusActive: false,
        boardState: {},
        wizardState: {},
        readyPlayerIds: []
    };

    console.log(`Initial Phase: ${state.phase}`);

    // 2. Advance Phase to Bidding
    console.log("\n-> Advancing to Bidding...");
    state = engine.advancePhase(state);
    
    if (state.phase === "Bidding") console.log("✔ Phase is Bidding");
    else console.error("❌ Phase mismatch");

    // Debug Logs from Action Log
    console.log("Action Log Snippet:", state.actionLog.slice(-3));

    // Check Auction Queue
    console.log(`Auction Queue Size: ${state.auctionQueue.length}`);
    // One card popped for current card, so should be 1 left (if 2 players)
    if (state.auctionQueue.length === 1) console.log("✔ Auction Queue initialized (1 card left)");
    else console.error(`❌ Auction Queue Fail: ${state.auctionQueue.length}`);

    // Check Current Card
    console.log(`Current Card: ${state.currentCard?.name}`);
    if (state.currentCard?.name === "Lasgun") console.log("✔ Current Card is Lasgun");

    // 3. Bidding Round 1
    // Starter? P1 (Mock Atreides first)
    // console.log("Log:", state.actionLog);
    // Log should say who starts.

    // P1 Bids 3
    console.log("\n-> P1 Bids 3");
    engine.placeBid(state, "p1", 3);
    
    if (state.currentBid === 3) console.log("✔ Bid Accepted");
    if (state.highBidderId === "p1") console.log("✔ High Bidder is P1");
    if (state.currentBidderId === "p2") console.log("✔ Turn Advanced to P2");

    // P2 Passes
    console.log("\n-> P2 Passes");
    engine.passBid(state, "p2");
    
    // Should pass back to P1 -> Win
    if (state.actionLog[state.actionLog.length - 1].includes("won Lasgun")) console.log("✔ P1 Won Auction");
    
    // Check P1 Hand
    if (state.factions[0].hand.length === 1 && state.factions[0].hand[0].name === "Lasgun") console.log("✔ P1 Hand Updated");
    if (state.factions[0].spice === 7) console.log("✔ P1 Spice Deducted (10-3=7)");
    
    // Next Auction Started?
    console.log(`\nNext Card: ${state.currentCard?.name}`);
    if (state.currentCard?.name === "Shield") console.log("✔ Next Auction Started (Shield)");

    console.log("\n--- Simulation Complete ---");
}

testBiddingPhase().catch(console.error);
