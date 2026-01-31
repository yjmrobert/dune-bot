import { SlashCommandBuilder, ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { GameManager } from "../engine/GameManager";

export const data = new SlashCommandBuilder()
    .setName("next-phase")
    .setDescription("Advances the game to the next phase")
    .addIntegerOption(option =>
        option.setName("game-id")
            .setDescription("The ID of the game")
            .setRequired(true)
    );

export async function execute(interaction: ChatInputCommandInteraction, manager: GameManager) {
    if (!interaction.guildId) return;

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const gameId = interaction.options.getInteger("game-id", true);

    try {
        const newState = await manager.advancePhase(gameId);
        await interaction.editReply(`Advanced to phase: ${newState.phase}`);
    } catch (e: any) {
        await interaction.editReply(`Error advancing phase: ${e.message}`);
    }
}
