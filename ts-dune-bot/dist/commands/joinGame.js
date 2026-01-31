"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.data = void 0;
exports.execute = execute;
const discord_js_1 = require("discord.js");
exports.data = new discord_js_1.SlashCommandBuilder()
    .setName("join-game")
    .setDescription("Joins an existing Dune game")
    .addIntegerOption(option => option.setName("game-id")
    .setDescription("The ID of the game to join")
    .setRequired(true));
async function execute(interaction, engine) {
    if (!interaction.guildId)
        return;
    await interaction.deferReply({ flags: discord_js_1.MessageFlags.Ephemeral });
    const gameId = interaction.options.getInteger("game-id", true);
    try {
        const { result } = await engine.registerPlayer(gameId, interaction.user.id, interaction.user.username);
        await interaction.editReply(result);
    }
    catch (e) {
        await interaction.editReply(`Error joining game: ${e.message}`);
    }
}
