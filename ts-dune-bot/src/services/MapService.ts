import { DiscordService } from "./DiscordService";
import { GameState } from "../types";
import { renderMap } from "../domain/mapPresenter";

export class MapService {
    static async updateMap(game: { guildId: string, mapChannelId: string }, state: GameState, discordService: DiscordService) {
        if (!game.mapChannelId) return;

        const view = renderMap(state);
        await discordService.sendImageView(game.guildId, game.mapChannelId, view);
    }
}
