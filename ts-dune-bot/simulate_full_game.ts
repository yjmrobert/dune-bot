
import { GameEngine } from './src/engine/GameEngine';
import { GameState, Faction, BattlePlan, TreacheryCard, SpiceCard } from './src/types';
import { BoardService } from './src/services/BoardService';

// Mock Data
const TREACHERY_DECK: TreacheryCard[] = [
    { id: 1, name: "Lasgun", type: "Weapon", isWeapon: true, isDefense: false, description: "", isSpecial: false },
    { id: 2, name: "Shield", type: "Defense", isWeapon: false, isDefense: true, description: "", isSpecial: false },
    { id: 3, name: "Snooper", type: "Defense", isWeapon: false, isDefense: true, description: "", isSpecial: false },
    { id: 4, name: "Cheap Hero", type: "Special", isWeapon: false, isDefense: false, description: "", isSpecial: true },
    { id: 5, name: "Truthtrance", type: "Special", isWeapon: false, isDefense: false, description: "", isSpecial: true },
    { id: 6, name: "Gom Jabbar", type: "Weapon", isWeapon: true, isDefense: false, description: "", isSpecial: false },
    { id: 7, name: "Stunner", type: "Weapon", isWeapon: true, isDefense: false, description: "", isSpecial: false },
    { id: 8, name: "Chaumas", type: "Weapon", isWeapon: true, isDefense: false, description: "", isSpecial: false }
];

const SPICE_DECK: SpiceCard[] = [
    { id: 1, name: "Great Flat", type: "Territory", amount: 10, sector: 1 },
    { id: 2, name: "Hagga Basin", type: "Territory", amount: 8, sector: 2 },
    { id: 3, name: "Imperial Basin", type: "Territory", amount: 6, sector: 3 },
    { id: 4, name: "Shai-Hulud", type: "Shai-Hulud", amount: 0, sector: 0 }
];

async function simulateFullGame() {
    console.log("--- Starting Full Game Simulation ---");
    const engine = new GameEngine();
    
    // 1. Initialize State
    let state: GameState = {
        phase: "Setup",
        turn: 0,
        stormLocation: 0, 
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
        boardState: {
             "Arrakeen": { name: "Arrakeen", spice: 0, forces: {} },
             "Carthag": { name: "Carthag", spice: 0, forces: {} },
             "Imperial Basin": { name: "Imperial Basin", spice: 0, forces: {} }
        },
        wizardState: {},
        readyPlayerIds: []
    };

    // 2. Register Players
    console.log("\n-> Registering Players");
    engine.registerPlayer(state, "p1", "AtreidesPlayer"); 
    state.factions = [];
    state.factions.push({
        faction: Faction.Atreides,
        playerDiscordId: "p1",
        playerName: "AtreidesPlayer",
        spice: 0,
        reserves: 0,
        forcesInTanks: 0,
        leaders: [{ name: "Duncan", strength: 2, isDead: false }, { name: "Gurney", strength: 4, isDead: false }],
        traitors: [],
        hand: []
    });
    state.factions.push({
        faction: Faction.Harkonnen,
        playerDiscordId: "p2",
        playerName: "HarkonnenPlayer",
        spice: 0,
        reserves: 0,
        forcesInTanks: 0,
        leaders: [{ name: "Feyd", strength: 6, isDead: false }, { name: "Beast", strength: 3, isDead: false }],
        traitors: [],
        hand: []
    });
    console.log(`Registered: ${state.factions.map(f => f.faction).join(", ")}`);

    // 3. Start Game
    console.log("\n-> Starting Game");
    engine.startGame(state, TREACHERY_DECK, SPICE_DECK);
    console.log(`Phase: ${state.phase}, Turn: ${state.turn}, Storm: ${state.stormLocation}`);

    // 4. Confirm Traitors
    console.log("\n-> Picking Traitors");
    const p1 = state.factions[0];
    const p2 = state.factions[1];
    const t1 = p1.traitorOptions ? p1.traitorOptions[0] : "None";
    const t2 = p2.traitorOptions ? p2.traitorOptions[0] : "None";
    engine.confirmTraitor(state, "p1", t1);
    engine.confirmTraitor(state, "p2", t2);
    console.log(`Phase: ${state.phase}`);

    // 5. Deploy Forces
    console.log("\n-> Deploying Forces");
    engine.deployForces(state, "p1", [{ territory: "Arrakeen", sector: 10, amount: 10 }]);
    engine.deployForces(state, "p2", [{ territory: "Carthag", sector: 11, amount: 10 }]);
    console.log(`Phase: ${state.phase}`);

    // 6. Storm Phase
    console.log("\n-> Moving Storm");
    engine.moveStorm(state, 3, []); 
    
    // User clicks Next Phase
    engine.advancePhase(state); 
    console.log(`Phase: ${state.phase}`); // Expect: Spice Blow

    // 7. Spice Blow
    console.log("\n-> Spice Blow");
    engine.revealSpiceBlow(state);
    engine.advancePhase(state);
    console.log(`Phase: ${state.phase}`); // Expect: CHOAM Charity (if no Nexus)

    if (state.phase === "Nexus") engine.advancePhase(state);

    // 8. CHOAM Charity
    console.log("\n-> CHOAM Charity");
    engine.advancePhase(state);
    console.log(`Phase: ${state.phase}`); // Expect: Bidding

    // 9. Bidding
    console.log("\n-> Bidding Phase");
    if (state.auctionQueue.length > 0) {
        console.log(`Auctioning Card: ${state.auctionQueue[0].name}`);
        engine.placeBid(state, "p1", 1);
        engine.passBid(state, "p2");
    }
    while (state.isBiddingRoundActive) {
         engine.passBid(state, "p1");
         engine.passBid(state, "p2");
    }
    if (state.phase === "Bidding") engine.advancePhase(state);
    console.log(`Phase: ${state.phase}`); // Expect: Revival

    // 10. Revival
    console.log("\n-> Revival Phase");
    engine.advancePhase(state);
    console.log(`Phase: ${state.phase}`); // Expect: Shipment and Movement

    // 11. Shipment and Movement
    console.log("\n-> Shipment & Movement");
    engine.advancePhase(state);
    console.log(`Phase: ${state.phase}`); // Expect: Battle

    // 12. Battle
    console.log("\n-> Battle Phase");
    engine.advancePhase(state);
    console.log(`Phase: ${state.phase}`); // Expect: Collection

    // 13. Collection
    console.log("\n-> Spice Collection");
    engine.resolveSpiceCollection(state);
    
    // Advance Phase -> Mentat Pause -> Auto-resolved -> Storm
    engine.advancePhase(state); 
    console.log(`Phase: ${state.phase}`); // Expect: Storm (Turn 2)

    console.log(`\nFinal State: Phase=${state.phase}, Turn=${state.turn}`);
    
    if (state.turn === 2 && state.phase === "Storm") {
        console.log("✔ Game Loop Verified: Turned over correctly.");
    } else {
        console.error("❌ Loop Failed.");
    }

    console.log("\n--- Simulation Complete ---");
}

simulateFullGame().catch(console.error);
