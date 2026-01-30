"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.data = void 0;
exports.execute = execute;
const discord_js_1 = require("discord.js");
exports.data = new discord_js_1.SlashCommandBuilder()
    .setName("delete-game")
    .setDescription("Deletes a Dune game")
    .addIntegerOption(option => option.setName("game-id")
    .setDescription("The ID of the game to delete")
    .setRequired(true));
async function execute(interaction, gameManager) {
    if (!interaction.guildId)
        return;
    // Ephemeral response first
    await interaction.reply({ content: "Deleting game...", ephemeral: true });
    const gameId = interaction.options.getInteger("game-id", true);
    try {
        await gameManager.deleteGame(gameId);
        await interaction.editReply(`Game ${gameId} deleted.`);
    }
    catch (e) {
        console.error(e);
        await interaction.editReply(`Error deleting game: ${e}`);
    }
}
