
import { GameEngine } from './src/engine/GameEngine';
import { GameState, Faction } from './src/types';

async function testStormPhase() {
    console.log("--- Starting Simulation: Storm Phase ---");

    const engine = new GameEngine();
    
    // 1. Setup State in Storm Phase
    let state: GameState = {
        phase: "Storm",
        turn: 1,
        stormLocation: 10,
        factions: [
            { faction: Faction.Atreides, playerDiscordId: "p1", playerName: "P1", spice: 0, reserves: 0, forcesInTanks: 0, leaders: [], traitors: [], hand: [] },
            { faction: Faction.Harkonnen, playerDiscordId: "p2", playerName: "P2", spice: 0, reserves: 0, forcesInTanks: 0, leaders: [], traitors: [], hand: [] }
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
        boardState: {
            "Territory A": { name: "Territory A", spice: 5, forces: {} }
        },
        wizardState: {},
        readyPlayerIds: []
    };

    console.log(`Initial Storm Location: ${state.stormLocation}`);
    console.log(`Initial Available Actions: ${engine.getAvailableActions(state)}`);

    // 2. Simulate Move Storm (Engine Call)
    console.log("\n-> Moving Storm (3 sectors)");
    state = engine.moveStorm(state, 3, []); // Check logic of resolving empty territories
    
    console.log(`New Storm Location: ${state.stormLocation}`);
    if (state.stormLocation === 13) console.log("✔ Storm Moved Correctly");
    else console.error("❌ Storm Move Fail");
    
    if (state.stormMovedThisTurn) console.log("✔ stormMovedThisTurn is TRUE");
    else console.error("❌ stormMovedThisTurn Fail");

    // 3. Check Available Actions (Should include NEXT_PHASE)
    const actions = engine.getAvailableActions(state);
    console.log(`Available Actions: ${actions}`);
    if (actions.includes("NEXT_PHASE")) console.log("✔ NEXT_PHASE available");
    else console.error("❌ NEXT_PHASE not available");

    // 4. Advance Phase
    console.log("\n-> Advancing Phase");
    state = engine.advancePhase(state);
    
    console.log(`Final Phase: ${state.phase}`);
    if (state.phase === "Spice Blow") console.log("✔ Advanced to Spice Blow");
    else console.error("❌ Advance Fail");
    
    // Check Storm Flag Reset
    // Actually stormMovedThisTurn should be false in NEXT turn storm phase, but false in Spice Blow?
    // It's a property of the state. It persists until reset.
    // engine.advancePhase logic:
    /*
        if (nextPhase === "Storm") {
            state.stormMovedThisTurn = false;
        }
    */
    // So in Spice Blow, it might still be true?
    // The flag is "Storm Moved This Turn". 
    // It blocks double movement.
    // It is reset when entering Storm phase.
    
    console.log("\n--- Simulation Complete ---");
}

testStormPhase().catch(console.error);
