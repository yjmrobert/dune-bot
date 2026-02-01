import { CommandContext, InteractionCommand } from "./Command";
import { MessageFlags, EmbedBuilder } from "discord.js";
import { prisma } from "../../db";
import { GameState } from "../../types";

export class PlayerInfoCommand implements InteractionCommand {
    async execute(context: CommandContext): Promise<void> {
        const { interaction, gameId } = context;
        const playerId = interaction.user.id;

        const game = await prisma.game.findUnique({ where: { id: gameId } });
        if (!game) {
            await interaction.reply({ content: "Game not found.", flags: MessageFlags.Ephemeral });
            return;
        }

        const state: GameState = JSON.parse(game.stateJson);
        const faction = state.factions.find(f => f.playerDiscordId === playerId);

        if (!faction) {
            await interaction.reply({ content: "You are not part of this game.", flags: MessageFlags.Ephemeral });
            return;
        }

        // Build Info Embed
        const embed = new EmbedBuilder()
            .setTitle(`Player Info: ${faction.faction}`)
            .setColor(0x0099FF)
            .addFields(
                { name: "Spice", value: faction.spice.toString(), inline: true },
                { name: "Reserves", value: faction.reserves.toString(), inline: true },
                { name: "Forces in Tanks", value: faction.forcesInTanks.toString(), inline: true }
            );

        // Leaders
        const livingLeaders = faction.leaders.filter(l => !l.isDead).map(l => `${l.name} (${l.strength})`).join(", ") || "None";
        const deadLeaders = faction.leaders.filter(l => l.isDead).map(l => `${l.name} (${l.strength})`).join(", ") || "None";
        embed.addFields(
            { name: "Leaders (Alive)", value: livingLeaders },
            { name: "Leaders (Tanks)", value: deadLeaders }
        );

        // Traitors
        if (faction.traitors.length > 0) {
            embed.addFields({ name: "Traitors", value: faction.traitors.join(", ") });
        } else if (faction.traitorOptions && faction.traitorOptions.length > 0) {
            embed.addFields({ name: "Traitor Candidates", value: faction.traitorOptions.join(", ") });
        }

        // Hand
        if (faction.hand.length > 0) {
            const handText = faction.hand.map(c => `**${c.name}** (${c.type})`).join("\n");
            embed.addFields({ name: "Treachery Cards", value: handText });
        } else {
             embed.addFields({ name: "Treachery Cards", value: "None" });
        }

        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }
}
