import { DiscordService } from "./DiscordService";
import { GameState } from "../types";
import { renderMap } from "../domain/mapPresenter";
import { prisma } from "../db";

export class MapService {
    static async updateMap(game: { id: number, guildId: string, mapChannelId: string, mapMessageId: string | null }, state: GameState, discordService: DiscordService) {
        if (!game.mapChannelId) return;

        const view = renderMap(state);

        if (game.mapMessageId) {
            try {
                await discordService.updateImageView(game.guildId, game.mapChannelId, game.mapMessageId, view);
                return;
            } catch (e) {
                console.warn("Failed to update map message, sending new one.", e);
            }
        }

        const msgId = await discordService.sendImageView(game.guildId, game.mapChannelId, view);

        // Update Game with new Map Message ID
        await prisma.game.update({
            where: { id: game.id },
            data: { mapMessageId: msgId }
        });
    }
}
