import { prisma } from "../db";
import { DiscordService } from "../services/DiscordService";
import { GameState } from "../types";
import { GameEngine } from "./GameEngine";
import { MapService } from "../services/MapService";

export class GameManager {
    constructor(
        private discordService: DiscordService,
        private gameEngine: GameEngine
    ) { }

    async createGame(guildId: string, name: string) {
        // 1. Create Placeholder Game to get ID
        const initialState: GameState = {
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

        const game = await prisma.game.create({
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
            await prisma.game.update({
                where: { id: game.id },
                data: {
                    categoryId: channels.categoryId,
                    actionsChannelId: channels.actionsId,
                    mapChannelId: channels.mapId,
                    tableTalkChannelId: channels.talkId
                }
            });

            // 4. Send Welcome/Lobby Message
            const view = {
                content: `**Dune Game Lobby**\n**Players (0/6):**\n*(Waiting for players...)*\n\nJoin the game and then start when ready.`,
                buttons: [
                    { label: "Join Game", style: "SUCCESS" as const, command: { type: "join-game", target: game.id.toString() } },
                    { label: "Start Game", style: "SUCCESS" as const, command: { type: "start-game", target: game.id.toString() } }
                ]
            };

            const msgId = await this.discordService.sendGameView(
                guildId,
                channels.actionsId,
                view
            );

            // 5. Update State with Lobby Message ID
            initialState.lobbyMessageId = msgId;
            await prisma.game.update({
                where: { id: game.id },
                data: {
                    stateJson: JSON.stringify(initialState)
                }
            });

            return game;

        } catch (error) {
            console.error("Failed to create game, rolling back...", error);
            // Rollback
            await prisma.game.delete({ where: { id: game.id } });
            // Ideally should also cleanup any created channels if partial failure
            throw error;
        }
    }

    async deleteGame(gameId: number) {
        const game = await prisma.game.findUnique({ where: { id: gameId } });
        if (!game) return;

        // 1. Delete Channels
        await this.discordService.deleteGameChannels(game.guildId, game.categoryId);

        // 2. Delete from DB
        await prisma.game.delete({ where: { id: gameId } });
    }

    async deleteAllGames() {
        const games = await prisma.game.findMany();
        let count = 0;
        for (const game of games) {
            await this.deleteGame(game.id);
            count++;
        }
        return count;
    }

    async advancePhase(gameId: number): Promise<GameState> {
        const game = await prisma.game.findUnique({ where: { id: gameId } });
        if (!game) throw new Error("Game not found.");

        // 1. Advance Phase
        const newState = await this.gameEngine.advancePhase(gameId);

        // 2. Update Map
        await MapService.updateMap(
            { guildId: game.guildId, mapChannelId: game.mapChannelId },
            newState,
            this.discordService
        );

        return newState;
    }
}
