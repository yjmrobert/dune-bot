
import { GameEngine } from './src/engine/GameEngine';
import { GameState, Faction } from './src/types';
import { BoardService } from './src/services/BoardService';

async function testSpiceCollection() {
    console.log("--- Starting Simulation: Spice Collection ---");

    const engine = new GameEngine();
    
    // 1. Setup State: 
    // - P1 (Atreides) has 5 forces in Arrakeen (Stronghold -> Control -> Rate 3? No, Arrakeen owner gets rate 3 globally? No, only rate 3? Rules check).
    // Engine Logic (from Step 424): 
    // `const rate = bonusFactions.has(factionId) ? 3 : 2;`
    // Bonus Factions = Controller of Arrakeen or Carthag.
    // So if P1 controls Arrakeen, rate is 3 everywhere? Or just basic 2 -> 3?
    // Rules: "If you control Arrakeen... you collect 3 spice per force."
    // - P2 (Harkonnen) has 5 forces in Broken Land (Spice 12). No Strongholds. Rate 2.
    
    let state: GameState = {
        phase: "Collection",
        turn: 4,
        stormLocation: 1,
        factions: [
            { 
                faction: Faction.Atreides, 
                playerDiscordId: "p1", 
                playerName: "P1", 
                spice: 0, 
                reserves: 5, 
                forcesInTanks: 0, 
                leaders: [], 
                traitors: [], 
                hand: [] 
            },
            { 
                faction: Faction.Harkonnen, 
                playerDiscordId: "p2", 
                playerName: "P2", 
                spice: 0, 
                reserves: 5, 
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
        boardState: {
            "Arrakeen": { 
                name: "Arrakeen", 
                spice: 0, 
                forces: {
                    10: { [Faction.Atreides]: 5 }
                } 
            },
            "Imperial Basin": {
                name: "Imperial Basin",
                spice: 20,
                forces: {
                     9: { [Faction.Atreides]: 2 }
                }
            },
            "Broken Land": {
                name: "Broken Land",
                spice: 12,
                forces: {
                    11: { [Faction.Harkonnen]: 5 }
                }
            }
        },
        wizardState: {},
        readyPlayerIds: []
    };

    console.log(`Initial Phase: ${state.phase}`);

    // 2. Resolve Collection
    console.log("\n-> Resolving Collection");
    engine.resolveSpiceCollection(state);
    
    const p1 = state.factions[0];
    const p2 = state.factions[1];
    
    // P1 Controls Arrakeen -> Rate 3.
    // P1 Forces in Imperial Basin: 2.
    // Collected = 2 * 3 = 6.
    // Note: Arrakeen has 0 spice.
    
    if (p1.spice === 6) console.log("✔ P1 Collected 6 (Rate 3)");
    else console.error(`❌ P1 Fail: ${p1.spice}`);
    
    // P2 No Stronghold -> Rate 2.
    // P2 Forces in Broken Land: 5.
    // Potential = 5 * 2 = 10.
    // Available = 12.
    // Collected = 10.
    
    if (p2.spice === 10) console.log("✔ P2 Collected 10 (Rate 2)");
    else console.error(`❌ P2 Fail: ${p2.spice}`);
    
    console.log("Logs:", state.actionLog.slice(-3));

    console.log("\n--- Simulation Complete ---");
}

testSpiceCollection().catch(console.error);
