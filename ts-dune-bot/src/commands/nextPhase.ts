import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import { GameEngine } from "../engine/GameEngine";

export const data = new SlashCommandBuilder()
    .setName("next-phase")
    .setDescription("Advances the game to the next phase")
    .addIntegerOption(option =>
        option.setName("game-id")
            .setDescription("The ID of the game")
            .setRequired(true)
    );

export async function execute(interaction: ChatInputCommandInteraction, engine: GameEngine) {
    if (!interaction.guildId) return;

    await interaction.deferReply({ ephemeral: true });
    const gameId = interaction.options.getInteger("game-id", true);

    try {
        const newState = await engine.advancePhase(gameId);
        await interaction.editReply(`Advanced to phase: ${newState.phase}`);
    } catch (e: any) {
        await interaction.editReply(`Error advancing phase: ${e.message}`);
    }
}
