import { CommandContext, InteractionCommand } from "./Command";

export class NextPhaseCommand implements InteractionCommand {
    async execute(context: CommandContext): Promise<void> {
        const { interaction, gameManager, gameId } = context;
        // if (!interaction.isButton()) return; // Could be other types? defaulting to button for now.

        if (interaction.isButton() || interaction.isStringSelectMenu()) { 
             await interaction.deferUpdate();
        }

        const state: GameState = JSON.parse(game.stateJson);

        // Barrier Check
        // Only check barrier if the phase uses it? 
        // Logic: specific phases use ready mechanics.
        // Setup_TraitorPick and Setup_Forces use separate legacy logic in Engine (deploy/confirm).
        // General Phases (Storm, Spice Blow, Nexus, etc) use Barrier?
        // Storm uses "Move Storm" trigger.
        // Spice Blow uses "Reveal" trigger.
        // Nexus uses "Ready".
        // Bidding uses "Ready".
        
        // If phase is Nexus, Bidding, Revival, Shipment, Battle, Collection, Mentat -> Check Barrier.
        const barrierPhases = ["Nexus", "Bidding", "Revival", "Shipment and Movement", "Battle", "Collection", "Mentat Pause", "CHOAM Charity"];
        
        if (barrierPhases.includes(state.phase)) {
            // We need to check barrier.
            // But `checkBarrier` is method on GameEngine instance?
            // Command has valid `gameManager.gameEngine` access? 
            // GameManager has `gameEngine`.
            // We can't access `gameManager.gameEngine` easily if private.
            // Assuming `gameManager.checkBarrier` exists? Or we check manually?
            // Let's rely on GameManager to check valid advance?
            // Or implement check here.
            
            // Re-implement simple check:
            const allPlayerIds = state.factions.map(f => f.playerDiscordId);
            const readyIds = state.readyPlayerIds || [];
            const allReady = allPlayerIds.every(id => readyIds.includes(id));
            
            if (!allReady) {
                 await interaction.followUp({ content: "Waiting for all players to be Ready.", flags: MessageFlags.Ephemeral });
                 return;
            }
        }

        await gameManager.advancePhase(gameId);
        
        // View update handled inside advancePhase usually? 
        // GameManager.advancePhase calls MapService, but does it call GamePresenter?
        // Checking GameManager.ts ...
        // advancePhase update: "Update Map". It does NOT update the Game View (Action Channel).
        // It returns newState.
        
        // So we must trigger view update.
        // @ts-ignore - Method to be added
        await gameManager.refreshGameView(gameId);
    }
}
