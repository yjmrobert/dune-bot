"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MapService = void 0;
const mapPresenter_1 = require("../domain/mapPresenter");
class MapService {
    static async updateMap(game, state, discordService) {
        if (!game.mapChannelId)
            return;
        const view = (0, mapPresenter_1.renderMap)(state);
        await discordService.sendImageView(game.guildId, game.mapChannelId, view);
    }
}
exports.MapService = MapService;
