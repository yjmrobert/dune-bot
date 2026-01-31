import { SlashCommandBuilder, ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { GameManager } from "../engine/GameManager";

export const data = new SlashCommandBuilder()
    .setName("start-game")
    .setDescription("Starts the Dune game")
    .addIntegerOption(option =>
        option.setName("game-id")
            .setDescription("The ID of the game to start")
            .setRequired(true)
    );

export async function execute(interaction: ChatInputCommandInteraction, manager: GameManager) {
    if (!interaction.guildId) return;

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const gameId = interaction.options.getInteger("game-id", true);

    try {
        const { state, game } = await manager.startGame(gameId);
        await interaction.editReply("Game Started! Check the action channel.");
        // TODO: Send message to action channel here too if desired, or rely on button handler mainly.
    } catch (e: any) {
        await interaction.editReply(`Error starting game: ${e.message}`);
    }
}
