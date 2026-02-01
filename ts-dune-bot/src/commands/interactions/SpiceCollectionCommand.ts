import { CommandContext, InteractionCommand } from "./Command";
import { MessageFlags } from "discord.js";
import { prisma } from "../../db";

export class SpiceCollectionCommand implements InteractionCommand {
    async execute(context: CommandContext): Promise<void> {
        const { interaction, gameManager, gameId } = context;

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            await gameManager.resolveSpiceCollection(gameId);
            await interaction.editReply({ content: "Spice Collection Processed. Check Action Log." });
        } catch (e: any) {
            await interaction.editReply({ content: `Error: ${e.message}` });
        }
    }
}
