
import { GameEngine } from './src/engine/GameEngine';
import { GameState, Faction, LeaderState } from './src/types';
import { WizardService } from './src/services/WizardService';

async function testNewWizards() {
    console.log("--- Starting Simulation: Revival, Shipment, Movement, Battle ---");

    const engine = new GameEngine();
    
    // 1. Setup Mock State
    let state: GameState = {
        phase: "Revival",
        turn: 1,
        stormLocation: 0,
        factions: [],
        actionLog: [],
        auctionQueue: [],
        currentBid: 0,
        isBiddingRoundActive: false,
        spiceDeck: [],
        spiceDiscard: [],
        treacheryDeck: [
            { id: 1, name: "WeaponCard", type: "Weapon", description: "", isWeapon: true, isDefense: false, isSpecial: false },
            { id: 2, name: "DefenseCard", type: "Defense", description: "", isWeapon: false, isDefense: true, isSpecial: false }
        ],
        treacheryDiscard: [],
        nexusActive: false,
        boardState: {
            "Arrakeen": { name: "Arrakeen", spice: 0, forces: { 10: { "Atreides": 5 }, 1: { "Harkonnen": 2 } } },
            "Carthag": { name: "Carthag", spice: 0, forces: {} },
            "Sietch Tabr": { name: "Sietch Tabr", spice: 0, forces: {} }
        },
        wizardState: {},
        readyPlayerIds: []
    };

    // 2. Register Player: Atreides (Manual Injection)
    state.factions.push({
        faction: Faction.Atreides,
        playerDiscordId: "p1",
        playerName: "Player 1",
        spice: 20,
        reserves: 10,
        forcesInTanks: 5,
        leaders: [
            { name: "Duke Leto", strength: 5, isDead: true },
            { name: "Duncan Idaho", strength: 2, isDead: false }
        ],
        traitors: [],
        hand: [state.treacheryDeck[0], state.treacheryDeck[1]]
    });
    // Add Dummy P2 for Battle
    state.factions.push({
        faction: Faction.Harkonnen,
        playerDiscordId: "p2",
        playerName: "Player 2",
        spice: 0,
        reserves: 0,
        forcesInTanks: 0,
        leaders: [],
        traitors: [],
        hand: []
    });

    console.log("State Initialized. Testing Revival...");

    // --- TEST 1: REVIVAL WIZARD ---
    // User Action: Add 2 Troops, Select Duke Leto
    
    // 1.1 Open Wizard
    let step = WizardService.getRevivalWizard(state, "p1");
    if (!step.embed?.data.description?.includes("Troops in Tanks")) console.error("❌ Revival Open Fail");

    // 1.2 Add Troop
    await WizardService.handleWizardInteraction(state, { user: { id: "p1" } }, "revival", "add_troop", []);
    // 1.3 Add Another Troop
    await WizardService.handleWizardInteraction(state, { user: { id: "p1" } }, "revival", "add_troop", []);
    
    // 1.4 Select Leader (Duke Leto)
    await WizardService.handleWizardInteraction(state, { user: { id: "p1" } }, "revival", "select_leader", ["Duke Leto"]);

    // Verify State
    const revState = WizardService.getWizardState(state, "p1", "revival");
    console.log("Revival State:", revState);
    if (revState.forces === 2 && revState.leader === "Duke Leto") console.log("✔ Revival State Correct");
    else console.error("❌ Revival State Fail");

    // --- TEST 2: SHIPMENT WIZARD ---
    console.log("\nTesting Shipment...");
    state.phase = "Shipment & Movement";

    // 2.1 Add 3 Troops
    await WizardService.handleWizardInteraction(state, { user: { id: "p1" } }, "shipment", "add_troop", []);
    await WizardService.handleWizardInteraction(state, { user: { id: "p1" } }, "shipment", "add_troop", []);
    await WizardService.handleWizardInteraction(state, { user: { id: "p1" } }, "shipment", "add_troop", []);

    // 2.2 Select Destination (Carthag)
    const mockSelect = {
        user: { id: "p1" },
        isStringSelectMenu: () => true,
        values: ["Carthag"]
    };
    await WizardService.handleWizardInteraction(state, mockSelect, "shipment", "select_destination", []);

    // Verify
    const shipState = WizardService.getWizardState(state, "p1", "shipment");
    console.log("Shipment State:", shipState);
    if (shipState.forces === 3 && shipState.destination === "Carthag") console.log("✔ Shipment State Correct");
    else console.error("❌ Shipment State Fail");

    // --- TEST 3: MOVEMENT WIZARD ---
    console.log("\nTesting Movement...");
    
    // 3.1 Select Origin (Arrakeen - has 5 Atreides)
    const mockFrom = {
         user: { id: "p1" },
         isStringSelectMenu: () => true,
         values: ["Arrakeen"]
    };
    await WizardService.handleWizardInteraction(state, mockFrom, "movement", "select_from", []);

    // 3.2 Select Dest (Sietch Tabr)
    const mockTo = {
         user: { id: "p1" },
         isStringSelectMenu: () => true,
         values: ["Sietch Tabr"]
    };
    await WizardService.handleWizardInteraction(state, mockTo, "movement", "select_to", []);

    // 3.3 Add 4 Troops
    for(let i=0; i<4; i++) {
        await WizardService.handleWizardInteraction(state, { user: { id: "p1" } }, "movement", "add_troop", []);
    }

    // Verify
    const movState = WizardService.getWizardState(state, "p1", "movement");
    console.log("Movement State:", movState);
    if (movState.from === "Arrakeen" && movState.to === "Sietch Tabr" && movState.forces === 4) console.log("✔ Movement State Correct");
    else console.error("❌ Movement State Fail");

    // --- TEST 4: BATTLE WIZARD ---
    console.log("\nTesting Battle...");
    state.phase = "Battle";
    state.battleState = {
        territory: "Arrakeen",
        aggressorId: "p2", // Enemy
        defenderId: "p1", // Us
        plans: {},
        resolved: false
    };

    // 4.1 Commit 5 troops (Max available in Arrakeen is 5)
    for(let i=0; i<5; i++) {
        await WizardService.handleWizardInteraction(state, { user: { id: "p1" } }, "battle", "commit_add", []);
    }

    // 4.2 Pick Leader: Duncan Idaho
    // Need to open menu first? Yes.
    await WizardService.handleWizardInteraction(state, { user: { id: "p1" } }, "battle", "menu_leader", []);
    // Now select
    await WizardService.handleWizardInteraction(state, { user: { id: "p1" } }, "battle", "select_leader", ["Duncan Idaho"]);

    // 4.3 Pick Weapon: WeaponCard
    await WizardService.handleWizardInteraction(state, { user: { id: "p1" } }, "battle", "menu_weapon", []);
    await WizardService.handleWizardInteraction(state, { user: { id: "p1" } }, "battle", "select_weapon", ["WeaponCard"]);

    // 4.4 Pick Defense: DefenseCard
    await WizardService.handleWizardInteraction(state, { user: { id: "p1" } }, "battle", "menu_defense", []);
    await WizardService.handleWizardInteraction(state, { user: { id: "p1" } }, "battle", "select_defense", ["DefenseCard"]);

    // Verify
    const batState = WizardService.getWizardState(state, "p1", "battle");
    console.log("Battle State:", batState);
    
    // Check embedded plan info in description? Or just state.
    // Spec says state maps to plan.
    if (batState.troops === 5 && batState.leader === "Duncan Idaho" && batState.weapon === "WeaponCard" && batState.defense === "DefenseCard") {
        console.log("✔ Battle State Correct");
    } else {
        console.error("❌ Battle State Fail");
    }

    console.log("\n--- Simulation Complete ---");
}

testNewWizards().catch(console.error);
