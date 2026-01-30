"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.data = void 0;
exports.execute = execute;
const discord_js_1 = require("discord.js");
exports.data = new discord_js_1.SlashCommandBuilder()
    .setName("delete-all-games")
    .setDescription("DANGER: Deletes ALL active Dune games");
async function execute(interaction, gameManager) {
    if (!interaction.guildId)
        return;
    await interaction.reply({ content: "Deleting ALL games...", ephemeral: true });
    try {
        const count = await gameManager.deleteAllGames();
        await interaction.editReply(`Deleted ${count} games.`);
    }
    catch (e) {
        console.error(e);
        await interaction.editReply(`Error deleting all games: ${e}`);
    }
}
