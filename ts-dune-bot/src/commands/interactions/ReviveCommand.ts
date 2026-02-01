import { CommandContext, InteractionCommand } from "./Command";
import { 
    MessageFlags, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder
} from "discord.js";
import { prisma } from "../../db";
import { GameState } from "../../types";

export class ReviveCommand implements InteractionCommand {
    async execute(context: CommandContext): Promise<void> {
        const { interaction, gameManager, gameId, args } = context;
        const subAction = args[0]; // e.g., "forces", "leader", "submit-forces", "submit-leader"
        
        // 1. Initial Menu (if no subAction)
        if (!subAction) {
            if (interaction.isButton() || interaction.isStringSelectMenu()) {
                // Determine Dead Leaders
                const game = await prisma.game.findUnique({ where: { id: gameId } });
                if (!game) return;
                const state: GameState = JSON.parse(game.stateJson);
                const faction = state.factions.find(f => f.playerDiscordId === interaction.user.id);
                
                // Buttons
                const row = new ActionRowBuilder<ButtonBuilder>()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId(`revive:forces:${gameId}`)
                            .setLabel("Revive Forces")
                            .setStyle(ButtonStyle.Primary),
                         new ButtonBuilder()
                            .setCustomId(`revive:leader:${gameId}`)
                            .setLabel("Revive Leader")
                            .setStyle(ButtonStyle.Primary)
                            .setDisabled(!faction || !faction.leaders.some(l => l.isDead)) 
                    );

                await interaction.reply({ 
                    content: "Choose options for Revival:", 
                    components: [row], 
                    flags: MessageFlags.Ephemeral 
                });
            }
            return;
        }

        // 2. Revive Forces Flow
        if (subAction === "forces") {
            if ('showModal' in interaction) {
                 const modal = new ModalBuilder()
                    .setCustomId(`revive:submit-forces:${gameId}`)
                    .setTitle("Revive Forces");

                const input = new TextInputBuilder()
                    .setCustomId("amount")
                    .setLabel("Amount (Max 3)")
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
                    .setPlaceholder("1");

                const row = new ActionRowBuilder<TextInputBuilder>().addComponents(input);
                modal.addComponents(row);

                await interaction.showModal(modal);
            }
            return;
        }

        if (subAction === "submit-forces") {
            if (interaction.isModalSubmit()) {
                await interaction.deferUpdate();
                const amount = parseInt(interaction.fields.getTextInputValue("amount"));
                try {
                     await gameManager.reviveForces(gameId, interaction.user.id, amount);
                     await interaction.followUp({ content: `Revived ${amount} forces.`, flags: MessageFlags.Ephemeral });
                } catch (e: any) {
                     await interaction.followUp({ content: `Error: ${e.message}`, flags: MessageFlags.Ephemeral });
                }
            }
            return;
        }

        // 3. Revive Leader Flow
        if (subAction === "leader") {
             if (interaction.isButton()) {
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                
                const game = await prisma.game.findUnique({ where: { id: gameId } });
                if (!game) return;
                const state: GameState = JSON.parse(game.stateJson);
                const faction = state.factions.find(f => f.playerDiscordId === interaction.user.id);
                if (!faction) return;

                const deadLeaders = faction.leaders.filter(l => l.isDead);
                if (deadLeaders.length === 0) {
                     await interaction.editReply({ content: "No dead leaders to revive." });
                     return;
                }

                const select = new StringSelectMenuBuilder()
                    .setCustomId(`revive:submit-leader:${gameId}`)
                    .setPlaceholder("Select a leader to revive")
                    .addOptions(
                        deadLeaders.map(l => 
                            new StringSelectMenuOptionBuilder()
                                .setLabel(`${l.name} (${l.strength})`)
                                .setValue(l.name)
                        )
                    );

                const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);
                
                await interaction.editReply({ 
                    content: "Select Leader:", 
                    components: [row] 
                });
             }
             return;
        }

        if (subAction === "submit-leader") {
            if (interaction.isStringSelectMenu()) {
                await interaction.deferUpdate();
                const leaderName = interaction.values[0];
                try {
                     await gameManager.reviveLeader(gameId, interaction.user.id, leaderName);
                     await interaction.followUp({ content: `Revived ${leaderName}.`, flags: MessageFlags.Ephemeral });
                } catch (e: any) {
                     await interaction.followUp({ content: `Error: ${e.message}`, flags: MessageFlags.Ephemeral });
                }
            }
            return;
        }
    }
}
