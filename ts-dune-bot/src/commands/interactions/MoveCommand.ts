import { CommandContext, InteractionCommand } from "./Command";
import { 
    MessageFlags, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle, 
    ActionRowBuilder 
} from "discord.js";
import { prisma } from "../../db";
import { GameState } from "../../types";

export class MoveCommand implements InteractionCommand {
    async execute(context: CommandContext): Promise<void> {
        const { interaction, gameManager, gameId, args } = context;

        // 1. Show Modal
        if (interaction.isButton()) {
            const modal = new ModalBuilder()
                .setCustomId(`move:submit:${gameId}`)
                .setTitle("Move Forces");

            const fromInput = new TextInputBuilder()
                .setCustomId("from")
                .setLabel("From Territory")
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setPlaceholder("Arrakeen");

            const toInput = new TextInputBuilder()
                .setCustomId("to")
                .setLabel("To Territory")
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setPlaceholder("Imperial Basin");

            const amountInput = new TextInputBuilder()
                .setCustomId("amount")
                .setLabel("Amount")
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setPlaceholder("3");

            modal.addComponents(
                new ActionRowBuilder<TextInputBuilder>().addComponents(fromInput),
                new ActionRowBuilder<TextInputBuilder>().addComponents(toInput),
                new ActionRowBuilder<TextInputBuilder>().addComponents(amountInput)
            );

            await interaction.showModal(modal);
            return;
        }

        // 2. Handle Submit
        if (interaction.isModalSubmit()) {
            // Note: Use deferReply if moving takes time, but usually quick.
            // But deferUpdate means "message updated", deferReply means "new message".
            // Since this is modal submit, deferUpdate updates the ORIGIN message (the button message)? 
            // Usually Modal Submit replies with Ephemeral or DeferUpdate.
            // MoveCommand creates a new log entry, so update game view.
            await interaction.deferUpdate();
            
            const from = interaction.fields.getTextInputValue("from");
            const to = interaction.fields.getTextInputValue("to");
            const amountStr = interaction.fields.getTextInputValue("amount");
            
            const amount = parseInt(amountStr);

            if (isNaN(amount)) {
                await interaction.followUp({ content: "Invalid number format.", flags: MessageFlags.Ephemeral });
                return;
            }

            try {
                await gameManager.moveForces(gameId, interaction.user.id, from, to, amount);
                await interaction.followUp({ content: `Moved ${amount} forces from ${from} to ${to}.`, flags: MessageFlags.Ephemeral });
            } catch (e: any) {
                await interaction.followUp({ content: `Move Failed: ${e.message}`, flags: MessageFlags.Ephemeral });
            }
        }
    }
}
