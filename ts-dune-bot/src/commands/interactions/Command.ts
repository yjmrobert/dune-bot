import { ButtonInteraction, StringSelectMenuInteraction } from "discord.js";
import { GameManager } from "../../engine/GameManager";

export interface CommandContext {
    interaction: ButtonInteraction | StringSelectMenuInteraction;
    gameManager: GameManager;
    gameId: number;
    args: string[];
}

export interface InteractionCommand {
    execute(context: CommandContext): Promise<void>;
}
