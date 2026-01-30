"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameManager = void 0;
const db_1 = require("../db");
class GameManager {
    discordService;
    constructor(discordService) {
        this.discordService = discordService;
    }
    async createGame(guildId, name) {
        // 1. Create Placeholder Game to get ID
        const initialState = {
            phase: "Setup",
            turn: 0,
            stormLocation: 0,
            factions: [],
            actionLog: [],
            auctionQueue: [],
            currentBid: 0,
            isBiddingRoundActive: false,
            spiceDeck: [],
            spiceDiscard: [],
            treacheryDeck: [],
            treacheryDiscard: [],
            nexusActive: false,
            boardState: {}
        };
        const game = await db_1.prisma.game.create({
            data: {
                guildId,
                categoryId: "",
                actionsChannelId: "",
                mapChannelId: "",
                tableTalkChannelId: "",
                stateJson: JSON.stringify(initialState)
            }
        });
        try {
            // 2. Create Channels
            const channels = await this.discordService.createGameChannels(guildId, game.id, name);
            // 3. Update Game with Channel IDs
            await db_1.prisma.game.update({
                where: { id: game.id },
                data: {
                    categoryId: channels.categoryId,
                    actionsChannelId: channels.actionsId,
                    mapChannelId: channels.mapId,
                    tableTalkChannelId: channels.talkId
                }
            });
            // 4. Send Welcome/Lobby Message
            const msgId = await this.discordService.sendActionMessage(guildId, channels.actionsId, `**Dune Game Lobby**\n**Players (0/6):**\n*(Waiting for players...)*\n\nJoin the game and then start when ready.`, [
                { label: "Join Game", customId: `join-game:${game.id}`, style: "Success" },
                { label: "Start Game", customId: `start-game:${game.id}`, style: "Success" }
            ]);
            // 5. Update State with Lobby Message ID
            initialState.lobbyMessageId = msgId;
            await db_1.prisma.game.update({
                where: { id: game.id },
                data: {
                    stateJson: JSON.stringify(initialState)
                }
            });
            return game;
        }
        catch (error) {
            console.error("Failed to create game, rolling back...", error);
            // Rollback
            await db_1.prisma.game.delete({ where: { id: game.id } });
            // Ideally should also cleanup any created channels if partial failure
            throw error;
        }
    }
    async deleteGame(gameId) {
        const game = await db_1.prisma.game.findUnique({ where: { id: gameId } });
        if (!game)
            return;
        // 1. Delete Channels
        await this.discordService.deleteGameChannels(game.guildId, game.categoryId);
        // 2. Delete from DB
        await db_1.prisma.game.delete({ where: { id: gameId } });
    }
    async deleteAllGames() {
        const games = await db_1.prisma.game.findMany();
        let count = 0;
        for (const game of games) {
            await this.deleteGame(game.id);
            count++;
        }
        return count;
    }
}
exports.GameManager = GameManager;
