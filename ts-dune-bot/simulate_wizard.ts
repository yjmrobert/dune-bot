
import { GameEngine } from './src/engine/GameEngine';
import { GameState, Faction } from './src/types';
import { WizardService } from './src/services/WizardService';

async function testWizardFlow() {
    console.log("--- Starting Simulation: Traitor Selection Wizard ---");

    const engine = new GameEngine();
    
    // 1. Setup Mock State
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
        treacheryDeck: [
            { id: 1, name: "Card 1", type: "Weapon", description: "", isWeapon: true, isDefense: false, isSpecial: false },
            { id: 2, name: "Card 2", type: "Defense", description: "", isWeapon: false, isDefense: true, isSpecial: false },
            { id: 3, name: "Card 3", type: "Special", description: "", isWeapon: false, isDefense: false, isSpecial: true },
            { id: 4, name: "Card 4", type: "Weapon", description: "", isWeapon: true, isDefense: false, isSpecial: false },
            { id: 5, name: "Card 5", type: "Defense", description: "", isWeapon: false, isDefense: true, isSpecial: false }
        ],
        treacheryDiscard: [],
        nexusActive: false,
        boardState: {},
        wizardState: {},
        readyPlayerIds: []
    };

    // 2. Register Players
    state = engine.registerPlayer(state, "p1", "Player 1");
    state = engine.registerPlayer(state, "p2", "Player 2");

    // 3. Start Game
    console.log("Starting Game...");
    state = engine.startGame(state, state.treacheryDeck, []); 
    
    console.log(`Phase: ${state.phase}`);
    console.log(`Traitor Options (P1): ${state.factions[0].traitorOptions?.join(", ")}`);

    // 4. Simulate P1 Opening Wizard (View Check)
    console.log("\n-> P1 Opens Wizard");
    const step1 = WizardService.getTraitorSelectionWizard(state, "p1");
    // console.log("Wizard Step 1 Content:", step1.content);
    // console.log("Wizard Step 1 Components:", JSON.stringify(step1.components));
    // Verify it asks to Select
    if (step1.content?.includes("Select the Traitor")) console.log("✔ Wizard Opens Correctly");
    else console.error("❌ Wizard Fail Step 1");

    // 5. Simulate P1 Selects "Card 1"
    console.log("\n-> P1 Selects 'Card 1'");
    // Call handleInteraction
    const mockInteraction = {
         user: { id: "p1" },
         isStringSelectMenu: () => true,
         values: ["Card 1"]
    };
    await WizardService.handleWizardInteraction(state, mockInteraction, "setup_traitor", "select", []);
    
    // Check Wizard State
    const wState = WizardService.getWizardState(state, "p1", "setup_traitor");
    if (wState.selectedTraitor === "Card 1") console.log("✔ Wizard State Updated");
    else console.error("❌ Wizard State Fail", wState);

    // 6. Simulate P1 Sees Confirmation View
    const step2 = WizardService.getTraitorSelectionWizard(state, "p1");
    if (step2.content?.includes("selected **Card 1**")) console.log("✔ Wizard Confirmation View Correct");
    else console.error("❌ Wizard Fail Step 2");

    // 7. Simulate P1 Confirms (Calls Engine)
    console.log("\n-> P1 Confirms Selection");
    state = engine.confirmTraitor(state, "p1", "Card 1");
    
    const p1Faction = state.factions.find(f => f.playerDiscordId === "p1");
    if (p1Faction?.traitors.includes("Card 1")) console.log("✔ P1 Traitor Confirmed in Engine");
    else console.error("❌ Engine Confirm Fail");

    if (state.phase === "Setup_TraitorPick") console.log("✔ Phase still Setup_TraitorPick (waiting for P2)");

    // 8. P2 Confirms
    console.log("\n-> P2 Confirms Selection (Card 2)");
    // (Skipping wizard steps, direct engine call)
    // Note: P2 must have options. startGame deals 4. P2 needs to pick one of THEIR options.
    const p2Opts = state.factions[1].traitorOptions || [];
    const p2Pick = p2Opts[0];
    state = engine.confirmTraitor(state, "p2", p2Pick);

    // 9. Check Phase Advance
    console.log(`\nFinal Phase: ${state.phase}`);
    if (state.phase === "Setup_Forces") console.log("✔ Phase Advanced to Setup_Forces");
    else console.error("❌ Phase Advance Fail");

    console.log("\n--- Simulation Complete ---");
}

testWizardFlow().catch(console.error);
