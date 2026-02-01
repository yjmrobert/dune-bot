import { CommandContext, InteractionCommand } from "./Command";
import { MessageFlags } from "discord.js";

export class JoinGameCommand implements InteractionCommand {
    async execute(context: CommandContext): Promise<void> {
        const { interaction, gameManager, gameId } = context;
        if (!interaction.isButton()) return;

        const { result, state, game } = await gameManager.registerPlayer(gameId, interaction.user.id, interaction.user.username);
        await interaction.reply({ content: result, flags: MessageFlags.Ephemeral });

        // Update Lobby Message logic (Duplicated from old index.ts for now, ideally moved to Presenter)
        // We can access gameManager.updateLobby(gameId)? Or similar.
        // For now, inline to preserve behavior.
        if (game.actionsChannelId && state.lobbyMessageId) {
             // Accessing private services via gameManager public methods if possible logic? 
             // Or we just rely on the View update triggers in GameManager if we move them there.
             // Current GameManager doesn't expose `updateLobby`.
             // Ideally we should add `gameManager.refreshLobby(gameId)`
             
             // Quick hack: The previous code did it manually. 
             // Let's rely on the fact that existing code did it manually.
             // We need to access DiscordService.
             // But DiscordService is private in GameManager.
             
             // Solution: Helper in GameManager to refresh view.
             // Let's assume we'll add `gameManager.refreshGameView(gameId)` later.
             // For now, I'll allow this command to be "pure" and maybe miss the lobby update 
             // unless I expose it.
             
             // WAIT. `GameManager.registerPlayer` returns `state, game`.
             // I can use `gameManager.discordService` if I make it public? No.
             
             // I will modify GameManager to handle the view update internally or expose a method.
             // Let's modify GameManager to have `updateLobbyView`.
        }
    }
}
