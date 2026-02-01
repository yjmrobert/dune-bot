import { CommandContext, InteractionCommand } from "./Command";
import { MessageFlags } from "discord.js";
import { renderGame } from "../../domain/gamePresenter";
import { MapService } from "../../services/MapService";

export class StartGameCommand implements InteractionCommand {
    async execute(context: CommandContext): Promise<void> {
        const { interaction, gameManager, gameId } = context;
        if (!interaction.isButton()) return;

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const { state, game } = await gameManager.startGame(gameId);
        await interaction.editReply("Game Started! Check the action channel.");

        if (game.actionsChannelId) {
            // We use gameManager's internal or public services if possible, 
            // but here we are importing services directly which is fine for now but tightly coupled.
            // Ideally GameManager exposes "refreshView".
            // Since we plan to update GameManager, let's defer the view logic to it if possible?
            // Or just use the GameManager methods we are ABOUT to add.
            
            // For now, I'll allow this command to call the NEW method on gameManager I am about to add.
            // @ts-ignore - Method will be added shortly
            await gameManager.refreshGameView(gameId);
        }
    }
}
