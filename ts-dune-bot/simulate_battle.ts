
import { GameEngine } from './src/engine/GameEngine';
import { GameState, Faction, BattlePlan } from './src/types';
import { BoardService } from './src/services/BoardService';

async function testBattlePhase() {
    console.log("--- Starting Simulation: Battle Phase ---");

    const engine = new GameEngine();
    
    // 1. Setup State: Battle in Arrakeen between Atreides (P1) and Harkonnen (P2)
    let state: GameState = {
        phase: "Battle",
        turn: 4,
        stormLocation: 1,
        factions: [
            { 
                faction: Faction.Atreides, 
                playerDiscordId: "p1", 
                playerName: "P1", 
                spice: 10, 
                reserves: 5, 
                forcesInTanks: 0, 
                leaders: [{ name: "Duncan Idaho", strength: 2, isDead: false }], 
                traitors: [], 
                hand: [{ id: 1, name: "Lasgun", type: "Weapon", isWeapon: true, isDefense: false, description: "", isSpecial: false }] 
            },
            { 
                faction: Faction.Harkonnen, 
                playerDiscordId: "p2", 
                playerName: "P2", 
                spice: 10, 
                reserves: 5, 
                forcesInTanks: 0, 
                leaders: [{ name: "Feyd-Rautha", strength: 6, isDead: false }], 
                traitors: [], 
                hand: [{ id: 2, name: "Shield", type: "Defense", isWeapon: false, isDefense: true, description: "", isSpecial: false }] 
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
                    10: {
                        [Faction.Atreides]: 5,
                        [Faction.Harkonnen]: 5
                    }
                } 
            }
        },
        wizardState: {},
        readyPlayerIds: []
    };

    console.log(`Initial Phase: ${state.phase}`);

    // 2. Initiate Battle
    console.log("\n-> Initiating Battle in Arrakeen");
    engine.initiateBattle(state, "Arrakeen");
    
    if (state.battleState) console.log("✔ Battle State Created");

    // 3. Submit Plan P1 (Atreides): Duncan (2) + Lasgun + Dial 5 = 7 (if no Dial check for weapon... Wait, Dial adds to strength)
    // Total = 2 + 5 = 7.
    console.log("\n-> P1 Submits Plan");
    const plan1: BattlePlan = {
        leaderName: "Duncan Idaho",
        weaponName: "Lasgun",
        dial: 5
    };
    engine.submitBattlePlan(state, "p1", plan1);
    
    if (state.battleState?.plans["p1"]) console.log("✔ P1 Plan Submitted");

    // 4. Submit Plan P2 (Harkonnen): Feyd (6) + Shield + Dial 2 = 8.
    console.log("\n-> P2 Submits Plan");
    const plan2: BattlePlan = {
        leaderName: "Feyd-Rautha",
        defenseName: "Shield",
        dial: 2
    };
    
    // This should trigger Resolution
    engine.submitBattlePlan(state, "p2", plan2);
    
    if (state.battleState?.resolved) console.log("✔ Battle Resolved");
    
    // Outcome:
    // P1: Duncan (2) + 5 = 7. Weapon Lasgun.
    // P2: Feyd (6) + 2 = 8. Defense Shield.
    // Lasgun vs Shield -> ATOMICS!
    // Both destroyed.
    
    console.log("Logs:", state.actionLog.slice(-5));
    
    const outcome = state.actionLog.find(l => l.includes("ATOMICS"));
    if (outcome) console.log("✔ ATOMICS Triggered correctly");
    else console.error("❌ Expected ATOMICS");

    // Check forces removed
    const arrakeen = BoardService.getForces(state, "Arrakeen");
    const p1Forces = arrakeen[Faction.Atreides] || 0;
    const p2Forces = arrakeen[Faction.Harkonnen] || 0;
    
    console.log(`Remaining Forces: P1=${p1Forces}, P2=${p2Forces}`);
    if (p1Forces === 0 && p2Forces === 0) console.log("✔ All forces destroyed (Atomics)");
    
    console.log("\n--- Simulation Complete ---");
}

testBattlePhase().catch(console.error);
