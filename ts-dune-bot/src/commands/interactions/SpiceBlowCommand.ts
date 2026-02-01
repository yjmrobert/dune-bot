import { CommandContext, InteractionCommand } from "./Command";
import { MessageFlags } from "discord.js";
import { prisma } from "../../db";
import { GameState } from "../../types";

export class SpiceBlowCommand implements InteractionCommand {
    async execute(context: CommandContext): Promise<void> {
        const { interaction, gameManager, gameId } = context;

        if (interaction.isButton()) {
             await interaction.deferUpdate();
        } else {
             await interaction.reply({ content: "Processing...", flags: MessageFlags.Ephemeral });
        }

        const game = await prisma.game.findUnique({ where: { id: gameId } });
        if (!game) return;

        const state: GameState = JSON.parse(game.stateJson);
        
        // Validation
        if (state.phase !== "Spice Blow") {
            await interaction.followUp({ content: "Not in Spice Blow Phase.", flags: MessageFlags.Ephemeral });
            return;
        }
        if (state.spiceBlowRevealed) {
             await interaction.followUp({ content: "Spice Blow already revealed.", flags: MessageFlags.Ephemeral });
             return;
        }

        // Execute logic
        await gameManager.revealSpiceBlow(gameId);

        // Feedback
        await interaction.followUp({ content: `Spice Blow Revealed! check the map channel.`, flags: MessageFlags.Ephemeral });
    }
}
