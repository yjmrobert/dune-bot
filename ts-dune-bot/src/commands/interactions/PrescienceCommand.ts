import { MessageFlags } from "discord.js";
import { InteractionCommand, CommandContext } from "./Command";
import { Faction, GameState } from "../../types";

export class PrescienceCommand implements InteractionCommand {
    async execute(context: CommandContext): Promise<void> {
        const { interaction, gameId, gameManager } = context;
        // Use user.id for reliability
        const userId = interaction.user.id;

        const game = await gameManager.getGame(gameId);
        if (!game) {
            await interaction.reply({ content: "Game not found.", flags: MessageFlags.Ephemeral });
            return;
        }
        const state: GameState = JSON.parse(game.stateJson);

        const player = state.factions.find(f => f.playerDiscordId === userId);
        if (!player || player.faction !== Faction.Atreides) {
            await interaction.reply({ content: "Only Atreides can use Prescience.", flags: MessageFlags.Ephemeral });
            return;
        }

        let message = "";

        // Context 1: Bidding Phase - Peek at current card
        if (state.phase === "Bidding" && state.isBiddingRoundActive && state.currentCard) {
            message = `**Prescience (Bidding)**: The card up for bid is **${state.currentCard.name}** (${state.currentCard.type}).\n\n${state.currentCard.description}`;
        } else {
            // Context 2: General - Peek at next Spice Card
            if (state.spiceDeck.length > 0) {
                const nextCard = state.spiceDeck[0];
                message = `**Prescience (Spice Deck)**: The next card in the Spice Deck is **${nextCard.name}** (${nextCard.type}).`;
                if (nextCard.amount) message += ` Amount: ${nextCard.amount}`;
                if (nextCard.sector) message += ` Sector: ${nextCard.sector}`;
            } else {
                message = "**Prescience**: The Spice Deck is empty.";
            }
        }

        await interaction.reply({ content: message, flags: MessageFlags.Ephemeral });
    }
}
