import { SlashCommandBuilder, ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { GameEngine } from "../engine/GameEngine";

export const data = new SlashCommandBuilder()
    .setName("join-game")
    .setDescription("Joins an existing Dune game")
    .addIntegerOption(option =>
        option.setName("game-id")
            .setDescription("The ID of the game to join")
            .setRequired(true)
    );

export async function execute(interaction: ChatInputCommandInteraction, engine: GameEngine) {
    if (!interaction.guildId) return;

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const gameId = interaction.options.getInteger("game-id", true);

    try {
        const { result } = await engine.registerPlayer(gameId, interaction.user.id, interaction.user.username);
        await interaction.editReply(result);
    } catch (e: any) {
        await interaction.editReply(`Error joining game: ${e.message}`);
    }
}
