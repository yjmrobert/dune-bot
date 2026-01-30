"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.data = void 0;
exports.execute = execute;
const discord_js_1 = require("discord.js");
exports.data = new discord_js_1.SlashCommandBuilder()
    .setName("create-game")
    .setDescription("Creates a new Dune game")
    .addStringOption(option => option.setName("name")
    .setDescription("The name of the game")
    .setRequired(false));
async function execute(interaction, gameManager) {
    if (!interaction.guildId) {
        await interaction.reply({ content: "This command can only be used in a server.", ephemeral: true });
        return;
    }
    await interaction.deferReply();
    const name = interaction.options.getString("name") || "Dune Game";
    try {
        const game = await gameManager.createGame(interaction.guildId, name);
        await interaction.editReply(`Game Created! ID: ${game.id}, Category: ${game.categoryId}`);
    }
    catch (e) {
        console.error(e);
        await interaction.editReply(`Error creating game. Check logs for details.`);
    }
}
