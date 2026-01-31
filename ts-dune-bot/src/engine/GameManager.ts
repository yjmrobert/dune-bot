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

    async registerPlayer(gameId: number, userId: string, username: string) {
        const game = await prisma.game.findUnique({ where: { id: gameId } });
        if (!game) throw new Error("Game not found.");

        const state: GameState = JSON.parse(game.stateJson);

        // Call Engine
        // Note: GameEngine.registerPlayer returns the updated state, but we also want a result message?
        // Actually GameEngine.registerPlayer returns 'state' in current implementation.
        // matching index.ts expectation: { result, state, game }
        // The engine doesn't return a "result string", so we construct it.

        try {
            this.gameEngine.registerPlayer(state, userId, username); // This mutates state or returns it

            // Save State
            await prisma.game.update({
                where: { id: gameId },
                data: { stateJson: JSON.stringify(state) }
            });

            const result = `Successfully joined as ${state.factions.find(f => f.playerDiscordId === userId)?.faction}`;
            return { result, state, game };

        } catch (error: any) {
            // If engine throws (e.g. game full), we propagate or handle. 
            // index.ts expects a successful object return usually, or catches error.
            // Let's rethrow to let index.ts catch it.
            throw error;
        }
    }

    // Add helper to expose actions
    getAvailableActions(state: GameState) {
        return this.gameEngine.getAvailableActions(state);
    }

    // Get player-specific private actions (cards, traitors, etc.)
    getPlayerActions(state: GameState, userId: string): string[] {
        const playerFaction = state.factions.find(f => f.playerDiscordId === userId);

        if (!playerFaction) {
            return [];
        }

        const actions: string[] = [];

        // Add cards from hand
        if (playerFaction.hand && playerFaction.hand.length > 0) {
            playerFaction.hand.forEach(card => {
                actions.push(`Card: ${card.name}`);
            });
        }

        // Add traitor information (masked)
        if (playerFaction.traitors && playerFaction.traitors.length > 0) {
            actions.push(`Traitors: ${playerFaction.traitors.length} known`);
        }

        // Add faction-specific abilities/status
        actions.push(`Spice: ${playerFaction.spice}`);
        actions.push(`Reserves: ${playerFaction.reserves}`);
        actions.push(`Forces in Tanks: ${playerFaction.forcesInTanks}`);

        return actions;
    }

    async getGame(gameId: number) {
        return prisma.game.findUnique({ where: { id: gameId } });
    }

    async startGame(gameId: number) {
        const game = await prisma.game.findUnique({ where: { id: gameId } });
        if (!game) throw new Error("Game not found.");

        const state: GameState = JSON.parse(game.stateJson);

        // Fetch Cards
        const treacheryCards = await prisma.treacheryCard.findMany();
        const spiceCards = await prisma.spiceCard.findMany();

        // Call Engine
        // Types from Prisma need to match Domain types. They are identical structurally.
        // @ts-ignore
        this.gameEngine.startGame(state, treacheryCards, spiceCards);

        // Save State
        await prisma.game.update({
            where: { id: gameId },
            data: { stateJson: JSON.stringify(state) }
        });

        return { state, game };
    }

    async advancePhase(gameId: number): Promise<GameState> {
        const game = await prisma.game.findUnique({ where: { id: gameId } });
        if (!game) throw new Error("Game not found.");

        const state: GameState = JSON.parse(game.stateJson);

        // 1. Advance Phase
        const newState = this.gameEngine.advancePhase(state); // Fix: Pass state, not gameId

        // Save State
        await prisma.game.update({
            where: { id: gameId },
            data: { stateJson: JSON.stringify(newState) }
        });

        // 2. Update Map
        await MapService.updateMap(
            { guildId: game.guildId, mapChannelId: game.mapChannelId },
            newState,
            this.discordService
        );

        return newState;
    }

    async moveStorm(gameId: number, sectors: number): Promise<GameState> {
        const game = await prisma.game.findUnique({ where: { id: gameId } });
        if (!game) throw new Error("Game not found.");

        const state: GameState = JSON.parse(game.stateJson);

        // Move Storm
        const newState = this.gameEngine.moveStorm(state, sectors);

        // Save State
        await prisma.game.update({
            where: { id: gameId },
            data: { stateJson: JSON.stringify(newState) }
        });

        // Update Map
        await MapService.updateMap(
            { guildId: game.guildId, mapChannelId: game.mapChannelId },
            newState,
            this.discordService
        );

        return newState;
    }

    async revealSpiceBlow(gameId: number): Promise<GameState> {
        const game = await prisma.game.findUnique({ where: { id: gameId } });
        if (!game) throw new Error("Game not found.");

        const state: GameState = JSON.parse(game.stateJson);

        // Reveal Spice Blow
        const newState = this.gameEngine.revealSpiceBlow(state);

        // Save State
        await prisma.game.update({
            where: { id: gameId },
            data: { stateJson: JSON.stringify(newState) }
        });

        // Update Map
        await MapService.updateMap(
            { guildId: game.guildId, mapChannelId: game.mapChannelId },
            newState,
            this.discordService
        );

        return newState;
    }
}
