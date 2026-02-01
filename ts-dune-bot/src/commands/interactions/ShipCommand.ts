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

export class ShipCommand implements InteractionCommand {
    async execute(context: CommandContext): Promise<void> {
        const { interaction, gameManager, gameId, args } = context;

        // 1. Show Modal
        if (interaction.isButton()) {
            const modal = new ModalBuilder()
                .setCustomId(`ship:submit:${gameId}`)
                .setTitle("Ship Forces");

            const territoryInput = new TextInputBuilder()
                .setCustomId("territory")
                .setLabel("Territory Name")
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setPlaceholder("Arrakeen");

            const sectorInput = new TextInputBuilder()
                .setCustomId("sector")
                .setLabel("Sector (Number)")
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setPlaceholder("1"); // Most use cases

            const amountInput = new TextInputBuilder()
                .setCustomId("amount")
                .setLabel("Amount")
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setPlaceholder("5");

            modal.addComponents(
                new ActionRowBuilder<TextInputBuilder>().addComponents(territoryInput),
                new ActionRowBuilder<TextInputBuilder>().addComponents(sectorInput),
                new ActionRowBuilder<TextInputBuilder>().addComponents(amountInput)
            );

            await interaction.showModal(modal);
            return;
        }

        // 2. Handle Submit
        if (interaction.isModalSubmit()) {
            await interaction.deferUpdate();
            
            const territory = interaction.fields.getTextInputValue("territory");
            const sectorStr = interaction.fields.getTextInputValue("sector");
            const amountStr = interaction.fields.getTextInputValue("amount");
            
            const sector = parseInt(sectorStr);
            const amount = parseInt(amountStr);

            if (isNaN(sector) || isNaN(amount)) {
                await interaction.followUp({ content: "Invalid number format.", flags: MessageFlags.Ephemeral });
                return;
            }

            try {
                await gameManager.shipForces(gameId, interaction.user.id, territory, sector, amount);
                await interaction.followUp({ content: `Shipped ${amount} forces to ${territory} (Sector ${sector}).`, flags: MessageFlags.Ephemeral });
            } catch (e: any) {
                await interaction.followUp({ content: `Shipment Failed: ${e.message}`, flags: MessageFlags.Ephemeral });
            }
        }
    }
}
