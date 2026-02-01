
import { GameEngine } from './src/engine/GameEngine';
import { GameState, Faction, SpiceCard } from './src/types';
import { NexusPhaseHandler } from './src/engine/phases/NexusPhaseHandler';

async function testSpicePhase() {
    console.log("--- Starting Simulation: Spice Blow Phase ---");

    const engine = new GameEngine();
    
    // 1. Setup State: Spice Blow Phase, Turn 2 (to allow Nexus)
    let state: GameState = {
        phase: "Spice Blow",
        turn: 2,
        stormLocation: 10,
        factions: [
            { faction: Faction.Atreides, playerDiscordId: "p1", playerName: "P1", spice: 0, reserves: 0, forcesInTanks: 0, leaders: [], traitors: [], hand: [] }
        ],
        actionLog: [],
        auctionQueue: [],
        currentBid: 0,
        isBiddingRoundActive: false,
        spiceDeck: [
            { id: 1, name: "Territory A", type: "Territory", amount: 6 },
            { id: 2, name: "Shai-Hulud", type: "Shai-Hulud" } 
        ] as SpiceCard[],
        spiceDiscard: [],
        treacheryDeck: [],
        treacheryDiscard: [],
        nexusActive: false,
        boardState: {},
        wizardState: {},
        readyPlayerIds: []
    };

    console.log(`Initial Phase: ${state.phase}`);

    // 2. Reveal Spice (Expected: Shai-Hulud -> Nexus Trig -> Territory A)
    // Actually engine.revealSpiceBlow calls resolveSpiceBlow which shifts.
    // Order in deck: Territory A is top? [0].
    // We want Shai-Hulud first.
    state.spiceDeck = [
        { id: 2, name: "Shai-Hulud", type: "Shai-Hulud" },
        { id: 1, name: "Territory A", type: "Territory", amount: 6 }
    ] as SpiceCard[];

    console.log("\n-> Revealing Spice...");
    state = engine.revealSpiceBlow(state);

    if (state.spiceBlowRevealed) console.log("✔ Spice Blow Revealed Flag Set");
    else console.error("❌ Revealed Flag Fail");
    
    if (state.nexusActive) console.log("✔ Nexus Active Flag Set");
    else console.error("❌ Nexus Flag Fail");
    
    // Check Logs
    // console.log("Logs:", state.actionLog);
    if (state.actionLog.some(l => l.includes("Nexus Occurred"))) console.log("✔ Log shows Nexus");

    // 3. Advance Phase (Should Go to Nexus)
    console.log("\n-> Advancing Phase (Expect Nexus)");
    state = engine.advancePhase(state);
    
    console.log(`Phase: ${state.phase}`);
    if (state.phase === "Nexus") console.log("✔ Phase is Nexus");
    else console.error("❌ Phase mismatch");

    // 4. Nexus Phase Actions (Barrier Check)
    // Mock NextPhaseCommand Check:
    state.readyPlayerIds = ["p1"];
    
    // 5. Advance Phase (Should Go to CHOAM)
    console.log("\n-> Advancing Phase (Expect CHOAM)");
    state = engine.advancePhase(state);
    
    console.log(`Phase: ${state.phase}`);
    if (state.phase === "CHOAM Charity") console.log("✔ Phase is CHOAM Charity");
    else console.error("❌ Phase mismatch");

    if (!state.nexusActive) console.log("✔ Nexus Flag Reset");
    else console.error("❌ Nexus Flag Not Reset");

    console.log("\n--- Simulation Complete ---");
}

testSpicePhase().catch(console.error);
