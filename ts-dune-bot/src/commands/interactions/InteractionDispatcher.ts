import { ButtonInteraction, StringSelectMenuInteraction, MessageFlags } from "discord.js";
import { GameManager } from "../../engine/GameManager";
import { InteractionCommand, CommandContext } from "./Command";

export class InteractionDispatcher {
    private commands: Record<string, InteractionCommand> = {};

    constructor(private gameManager: GameManager) {}

    register(action: string, command: InteractionCommand) {
        this.commands[action] = command;
    }

    async dispatch(interaction: ButtonInteraction | StringSelectMenuInteraction) {
        const parts = interaction.customId.split(":");
        const action = parts[0];
        const param = parts[1];
        
        // Handle complex wizard args if needed (e.g. wizard:setup:step:gameId)
        // For now, assuming "action:gameId" or "action:arg:gameId"
        
        // Standard Format: action:gameId OR action:subAction:gameId
        // Let's try to parse flexibly.
        
        let gameIdStr = param;
        let args: string[] = [];

        // If there are more parts, the last one is likely gameId
        if (parts.length > 2) {
            gameIdStr = parts[parts.length - 1];
            args = parts.slice(1, parts.length - 1);
        }

        const gameId = parseInt(gameIdStr);
        if (isNaN(gameId)) {
            console.error("Invalid Game ID in interaction:", interaction.customId);
            return;
        }

        const command = this.commands[action];
        if (!command) {
            console.warn(`No handler for action: ${action}`);
            // Optionally reply?
            return;
        }

        const context: CommandContext = {
            interaction,
            gameManager: this.gameManager,
            gameId,
            args
        };

        try {
            await command.execute(context);
        } catch (error: any) {
            console.error(`Error executing ${action}:`, error);
            
             // Ignore Unknown Interaction (10062) and Already Acknowledged (40060)
            if (error.code === 10062 || error.code === 40060) {
                return;
            }

            if (interaction.deferred || interaction.replied) {
                await interaction.followUp({ content: `Error: ${error.message}`, flags: MessageFlags.Ephemeral }).catch(e => console.error(e));
            } else {
                await interaction.reply({ content: `Error: ${error.message}`, flags: MessageFlags.Ephemeral }).catch(e => console.error(e));
            }
        }
    }
}
