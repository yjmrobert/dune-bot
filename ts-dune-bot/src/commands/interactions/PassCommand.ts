import { CommandContext, InteractionCommand } from "./Command";
import { MessageFlags } from "discord.js";
import { prisma } from "../../db";
import { GameState } from "../../types";

export class PassCommand implements InteractionCommand {
    async execute(context: CommandContext): Promise<void> {
        const { interaction, gameManager, gameId } = context;

        if (interaction.isButton()) {
             await interaction.deferUpdate();
        }

        try {
            await gameManager.passBid(gameId, interaction.user.id);
            await interaction.followUp({ content: "You passed.", flags: MessageFlags.Ephemeral });
        } catch (err: any) {
            if (interaction.isRepliable()) {
                  await interaction.followUp({ content: `Pass Failed: ${err.message}`, flags: MessageFlags.Ephemeral });
            }
        }
    }
}
