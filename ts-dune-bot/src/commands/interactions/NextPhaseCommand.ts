import { CommandContext, InteractionCommand } from "./Command";

export class NextPhaseCommand implements InteractionCommand {
    async execute(context: CommandContext): Promise<void> {
        const { interaction, gameManager, gameId } = context;
        // if (!interaction.isButton()) return; // Could be other types? defaulting to button for now.

        if (interaction.isButton() || interaction.isStringSelectMenu()) { 
             await interaction.deferUpdate();
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
