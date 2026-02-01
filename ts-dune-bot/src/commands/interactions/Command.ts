import { ButtonInteraction, StringSelectMenuInteraction, ModalSubmitInteraction } from "discord.js";
import { GameManager } from "../../engine/GameManager";

export interface CommandContext {
    interaction: ButtonInteraction | StringSelectMenuInteraction | ModalSubmitInteraction;
    gameManager: GameManager;
    gameId: number;
    args: string[];
}

export interface InteractionCommand {
    execute(context: CommandContext): Promise<void>;
}
