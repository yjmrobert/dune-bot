import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import { GameEngine } from "../engine/GameEngine";

export const data = new SlashCommandBuilder()
    .setName("start-game")
    .setDescription("Starts the Dune game")
    .addIntegerOption(option =>
        option.setName("game-id")
            .setDescription("The ID of the game to start")
            .setRequired(true)
    );

export async function execute(interaction: ChatInputCommandInteraction, engine: GameEngine) {
    if (!interaction.guildId) return;

    await interaction.deferReply({ ephemeral: true });
    const gameId = interaction.options.getInteger("game-id", true);

    try {
        await engine.startGame(gameId);
        await interaction.editReply("Game Started! Check the action channel.");
    } catch (e: any) {
        await interaction.editReply(`Error starting game: ${e.message}`);
    }
}
