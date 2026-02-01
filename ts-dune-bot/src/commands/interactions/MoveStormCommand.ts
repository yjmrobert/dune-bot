import { CommandContext, InteractionCommand } from "./Command";
import { MessageFlags } from "discord.js";
import { prisma } from "../../db";
import { GameState } from "../../types";

export class MoveStormCommand implements InteractionCommand {
    async execute(context: CommandContext): Promise<void> {
        const { interaction, gameManager, gameId } = context;

        // Verify Interaction is valid
        if (interaction.isButton()) {
             await interaction.deferUpdate();
        } else {
             await interaction.reply({ content: "Processing...", flags: MessageFlags.Ephemeral });
        }

        const game = await prisma.game.findUnique({ where: { id: gameId } });
        if (!game) return;

        const state: GameState = JSON.parse(game.stateJson);
        
        // Validation
        if (state.phase !== "Storm") {
            await interaction.followUp({ content: "Not in Storm Phase.", flags: MessageFlags.Ephemeral });
            return;
        }
        if (state.stormMovedThisTurn) {
             await interaction.followUp({ content: "Storm already moved this turn.", flags: MessageFlags.Ephemeral });
             return;
        }

        // Generate Movement (1d6)
        // TODO: Handle Weather Control card interaction (requires wizard?)
        // For now, random 1-6
        const sectors = Math.floor(Math.random() * 6) + 1;

        // Execute
        await gameManager.moveStorm(gameId, sectors);

        // View is updated by GameManager calling MapService/Refresh
        // interaction update? deferred.
        // We might want to send a message confirming the roll?
        // GameManager adds to actionLog.
        // But ephemeral feedback is nice.
        await interaction.followUp({ content: `Storm rolled a **${sectors}**!`, flags: MessageFlags.Ephemeral });
    }
}
