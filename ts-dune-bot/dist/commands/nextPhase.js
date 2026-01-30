"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.data = void 0;
exports.execute = execute;
const discord_js_1 = require("discord.js");
exports.data = new discord_js_1.SlashCommandBuilder()
    .setName("next-phase")
    .setDescription("Advances the game to the next phase")
    .addIntegerOption(option => option.setName("game-id")
    .setDescription("The ID of the game")
    .setRequired(true));
async function execute(interaction, engine) {
    if (!interaction.guildId)
        return;
    await interaction.deferReply({ ephemeral: true });
    const gameId = interaction.options.getInteger("game-id", true);
    try {
        const newState = await engine.advancePhase(gameId);
        await interaction.editReply(`Advanced to phase: ${newState.phase}`);
    }
    catch (e) {
        await interaction.editReply(`Error advancing phase: ${e.message}`);
    }
}
