import { CommandContext, InteractionCommand } from "./Command";
import { 
    MessageFlags, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle, 
    ActionRowBuilder,
    ModalSubmitInteraction 
} from "discord.js";
import { prisma } from "../../db";
import { GameState } from "../../types";

export class BidCommand implements InteractionCommand {
    async execute(context: CommandContext): Promise<void> {
        const { interaction, gameManager, gameId } = context;

        // 1. Handle Button Click -> Show Modal
        if (interaction.isButton()) {
            const modal = new ModalBuilder()
                .setCustomId(`bid:submit:${gameId}`)
                .setTitle("Place Your Bid");

            const input = new TextInputBuilder()
                .setCustomId("bidAmount")
                .setLabel("Amount of Spice to Bid")
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setPlaceholder("Enter a number (e.g. 5)");

            const row = new ActionRowBuilder<TextInputBuilder>().addComponents(input);
            modal.addComponents(row);

            await interaction.showModal(modal);
            return;
        }

        // 2. Handle Modal Submit -> Process Bid
        if (interaction.isModalSubmit()) {
            await interaction.deferUpdate(); // Acknowledge generic update (or reply ephemeral)
            
            const amountStr = interaction.fields.getTextInputValue("bidAmount");
            const amount = parseInt(amountStr);

            if (isNaN(amount) || amount < 0) {
                await interaction.followUp({ content: "Invalid bid amount.", flags: MessageFlags.Ephemeral });
                return;
            }

            const game = await prisma.game.findUnique({ where: { id: gameId } });
            if (!game) return;
            const state: GameState = JSON.parse(game.stateJson);

            try {
                // Determine user faction
                const faction = state.factions.find(f => f.playerDiscordId === interaction.user.id);
                if (!faction) throw new Error("Player not found.");

                // Check spice
                if (faction.spice < amount) {
                     await interaction.followUp({ content: `Not enough spice. You have ${faction.spice}.`, flags: MessageFlags.Ephemeral });
                     return;
                }

                await gameManager.placeBid(gameId, interaction.user.id, amount);
                await interaction.followUp({ content: `You bid ${amount}.`, flags: MessageFlags.Ephemeral });

            } catch (err: any) {
                await interaction.followUp({ content: `Bid Failed: ${err.message}`, flags: MessageFlags.Ephemeral });
            }
        }
    }
}
