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

        // Generate Movement
        // First Turn: 0-20
        // Subsequent: 1-6
        let sectors = 0;
        if (state.turn === 1) {
             sectors = Math.floor(Math.random() * 21); // 0-20
             // Correction: If this is the FIRST time the storm is placed, it's 0-20 from START?
             // Or from current location?
             // Rules: "A random number between 0 and 20 is generated and the Storm Marker moved from the Storm Start sector..."
             // Where is Storm Start? If undefined, assume 18? Or 0?
             // Usually initialized at 18 or 0.
             // If state.stormLocation is effectively undefined or default, handle it.
        } else {
             sectors = Math.floor(Math.random() * 6) + 1; // 1-6
        }

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
