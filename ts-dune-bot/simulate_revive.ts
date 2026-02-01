
import { GameEngine } from './src/engine/GameEngine';
import { GameState, Faction, TreacheryCard } from './src/types';

async function testRevivalPhase() {
    console.log("--- Starting Simulation: Revival Phase ---");

    const engine = new GameEngine();
    
    // 1. Setup State: Revival Phase, Player has forces in tanks
    let state: GameState = {
        phase: "Revival",
        turn: 3,
        stormLocation: 10,
        factions: [
            { 
                faction: Faction.Atreides, 
                playerDiscordId: "p1", 
                playerName: "P1", 
                spice: 10, 
                reserves: 0, 
                forcesInTanks: 5, 
                leaders: [{ name: "Duncan Idaho", strength: 2, isDead: true }], 
                traitors: [], 
                hand: [] 
            }
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
        boardState: {},
        wizardState: {},
        readyPlayerIds: []
    };

    console.log(`Initial Phase: ${state.phase}`);

    // 2. Revive Forces (2 free for Atreides)
    console.log("\n-> P1 Revives 2 Forces (Free?)");
    engine.reviveForces(state, "p1", 2);
    
    const p1 = state.factions[0];
    if (p1.forcesInTanks === 3) console.log("✔ Tank Count Updated (5 -> 3)");
    else console.error(`❌ Tank Count Fail: ${p1.forcesInTanks}`);
    if (p1.reserves === 2) console.log("✔ Reserves Updated (0 -> 2)");
    if (p1.spice === 10) console.log("✔ Spice Unchanged (Free Limit)");

    // 3. Revive Forces (Above Limit)
    console.log("\n-> P1 Revives 1 Force (Paid)");
    // Note: limit check logic in engine might prevent multiple calls if not strictly tracked "per turn".
    // Engine only checks `count > limit` for cost, doesn't accumulate count.
    // So separate calls treat each as separate "turn" effectively if not tracking usage.
    // RevivalEngine logic: `if (count > limit) cost = ...`.
    // It does NOT check `revivedThisTurn`.
    // So calling again with 1 (where limit is 2) will be FREE again.
    // This is a Logic Gap in MVP engine.
    // For now, testing the Cost Logic by reviving 3 at once (limit 2).
    
    // Reset state for cost test
    p1.forcesInTanks = 5;
    p1.reserves = 0;
    p1.spice = 10;
    
    console.log("\n-> P1 Revives 3 Forces (2 Free, 1 Paid cost 2)");
    engine.reviveForces(state, "p1", 3);
    
    if (p1.spice === 8) console.log("✔ Spice Deducted (10 -> 8)");
    else console.error(`❌ Spice Fail: ${p1.spice}`);

    // 4. Revive Leader
    console.log("\n-> P1 Revives Leader Duncan Idaho (Cost 2)");
    // Wait, Duncan was not dead in my setup object structure?
    // Added `isDead: true` in setup above.
    
    engine.reviveLeader(state, "p1", "Duncan Idaho");
    
    if (p1.leaders[0].isDead === false) console.log("✔ Leader is Alive");
    if (p1.spice === 6) console.log("✔ Spice Deducted (8 -> 6)");
    else console.error(`❌ Spice Fail: ${p1.spice}`);
    
    console.log("Logs:", state.actionLog.slice(-3));

    console.log("\n--- Simulation Complete ---");
}

testRevivalPhase().catch(console.error);
