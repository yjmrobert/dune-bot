"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.data = void 0;
exports.execute = execute;
const discord_js_1 = require("discord.js");
exports.data = new discord_js_1.SlashCommandBuilder()
    .setName("start-game")
    .setDescription("Starts the Dune game")
    .addIntegerOption(option => option.setName("game-id")
    .setDescription("The ID of the game to start")
    .setRequired(true));
async function execute(interaction, engine) {
    if (!interaction.guildId)
        return;
    await interaction.deferReply({ flags: discord_js_1.MessageFlags.Ephemeral });
    const gameId = interaction.options.getInteger("game-id", true);
    try {
        const { state, game } = await engine.startGame(gameId);
        await interaction.editReply("Game Started! Check the action channel.");
        // TODO: Send message to action channel here too if desired, or rely on button handler mainly.
    }
    catch (e) {
        await interaction.editReply(`Error starting game: ${e.message}`);
    }
}
