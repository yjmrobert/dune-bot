
import { GameEngine } from './src/engine/GameEngine';
import { GameState, Faction } from './src/types';
import { BoardService } from './src/services/BoardService';

async function testShipmentAndMovement() {
    console.log("--- Starting Simulation: Shipment & Movement ---");

    const engine = new GameEngine();
    
    // 1. Setup State
    let state: GameState = {
        phase: "Shipment and Movement",
        turn: 3,
        stormLocation: 1, // Storm at 1, Arrakeen at 10 (Safe)
        factions: [
            { 
                faction: Faction.Atreides, 
                playerDiscordId: "p1", 
                playerName: "P1", 
                spice: 20, 
                reserves: 10, 
                forcesInTanks: 0, 
                leaders: [], 
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

    // 2. Ship Forces to Arrakeen (Stronghold, Cost 1/force)
    // Arrakeen is Sector 10.
    console.log("\n-> P1 Ships 5 Forces to Arrakeen (Sector 10)");
    engine.shipForces(state, "p1", "Arrakeen", 10, 5);
    
    const p1 = state.factions[0];
    if (p1.spice === 15) console.log("✔ Spice Deducted (20 -> 15)");
    else console.error(`❌ Spice Fail: ${p1.spice}`);
    
    if (BoardService.getForces(state, "Arrakeen")["Atreides"] === 5) console.log("✔ Forces on Arrakeen");
    
    // 3. Move Forces to Imperial Basin (Adjacent)
    console.log("\n-> P1 Moves 3 Forces to Imperial Basin");
    engine.moveForces(state, "p1", "Arrakeen", "Imperial Basin", 3);
    
    if (BoardService.getForces(state, "Imperial Basin")["Atreides"] === 3) console.log("✔ Forces Moved to Imperial Basin");
    if (BoardService.getForces(state, "Arrakeen")["Atreides"] === 2) console.log("✔ Forces Remaining on Arrakeen Correct (5-3=2)");

    // 4. Test Invalid Move (Too far)
    console.log("\n-> P1 Tries to Move to Habbanya Ridge (Too Far)");
    try {
        engine.moveForces(state, "p1", "Imperial Basin", "Habbanya Ridge", 1);
        console.error("❌ Should have failed distance check");
    } catch (e: any) {
        console.log(`✔ Blocked Too Far: ${e.message}`);
    }

    console.log("\n--- Simulation Complete ---");
}

testShipmentAndMovement().catch(console.error);
