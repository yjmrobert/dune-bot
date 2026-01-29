import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import { GameManager } from "../engine/GameManager";

export const data = new SlashCommandBuilder()
    .setName("delete-all-games")
    .setDescription("DANGER: Deletes ALL active Dune games");

export async function execute(interaction: ChatInputCommandInteraction, gameManager: GameManager) {
    if (!interaction.guildId) return;

    await interaction.reply({ content: "Deleting ALL games...", ephemeral: true });

    try {
        const count = await gameManager.deleteAllGames();
        await interaction.editReply(`Deleted ${count} games.`);
    } catch (e) {
        console.error(e);
        await interaction.editReply(`Error deleting all games: ${e}`);
    }
}
