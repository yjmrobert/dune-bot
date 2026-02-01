
import { GameEngine } from './src/engine/GameEngine';
import { GameState, Faction } from './src/types';
import { WizardService } from './src/services/WizardService';

async function testForceWizard() {
    console.log("--- Starting Simulation: Force Placement Wizard ---");

    const engine = new GameEngine();
    
    // 1. Setup Mock State (At Setup phase initially)
    let state: GameState = {
        phase: "Setup",
        turn: 1,
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
        boardState: {},
        wizardState: {},
        readyPlayerIds: []
    };

    // 2. Register Player & Initialize
    state = engine.registerPlayer(state, "p1", "Player 1");
    // Manually init Atreides for Setup_Forces
    state.phase = "Setup_Forces"; // Switch Phase manually
    state.factions[0].faction = Faction.Atreides;
    state.factions[0].reserves = 20; 
    state.pendingPlayerIds = ["p1"];

    console.log(`Phase: ${state.phase}`);
    console.log(`Reserves (P1): ${state.factions[0].reserves}`);

    // 3. Simulate P1 Opens Wizard
    console.log("\n-> P1 Opens Force Wizard");
    const step1 = WizardService.getForcePlacementWizard(state, "p1");
    // console.log("Step 1 Embed:", JSON.stringify(step1.embed));
    if (step1.embed?.data.description?.includes("Reserves Available: **20**")) console.log("✔ Reserves Display Correct");
    else console.error("❌ Reserves Display Fail");

    // 4. Simulate P1 Adds 5 to Arrakeen
    console.log("\n-> P1 Adds 5 Forces to Arrakeen");
    // 5 clicks
    for (let i = 0; i < 5; i++) {
        const mockInteraction = { user: { id: "p1" } };
        await WizardService.handleWizardInteraction(state, mockInteraction, "setup_forces", "add", ["Arrakeen"]);
    }
    
    const wState = WizardService.getWizardState(state, "p1", "setup_forces");
    if (wState.forces["Arrakeen"] === 5) console.log("✔ Wizard State: Arrakeen = 5");
    else console.error("❌ Wizard State Fail", wState);

    // 5. Simulate P1 Confirms
    console.log("\n-> P1 Confirms Deployment");
    
    // Deploy
    state = engine.deployForces(state, "p1", [{ territory: "Arrakeen", sector: 10, amount: 5 }]);
    
    const p1Faction = state.factions[0];
    if (p1Faction.reserves === 15) console.log("✔ Reserves reduced to 15");
    else console.error(`❌ Reserves Fail: ${p1Faction.reserves}`);
    
    const boardForce = state.boardState["Arrakeen"]?.forces[10]["Atreides"];
    if (boardForce === 5) console.log("✔ Board State Updated (Arrakeen: 5)");
    else console.error(`❌ Board State Fail: ${boardForce}`);
    
    console.log(`\nFinal Phase: ${state.phase}`);
    if (state.phase === "Storm") console.log("✔ Phase Advanced to Storm (Game Loop)");
    else console.error("❌ Phase Advance Fail");

    console.log("\n--- Simulation Complete ---");
}

testForceWizard().catch(console.error);
