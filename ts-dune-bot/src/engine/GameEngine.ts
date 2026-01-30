import { prisma } from "../db";
import { GameState, Faction, FactionState, TreacheryCard } from "../types";
import { ApplicationCommandOptionChoiceData } from "discord.js";
import { BiddingEngine } from "./BiddingEngine";

// Utility to get random item from array
function sample<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

export class GameEngine {
    private biddingEngine = new BiddingEngine();

    async registerPlayer(gameId: number, userId: string, username: string): Promise<string> {
        const game = await prisma.game.findUnique({ where: { id: gameId } });
        if (!game) throw new Error("Game not found.");

        const state = JSON.parse(game.stateJson) as GameState;

        if (state.phase !== "Setup") throw new Error("Cannot join game in progress.");
        if (state.factions.some(f => f.playerDiscordId === userId)) throw new Error("Player already joined.");
        if (state.factions.length >= 6) throw new Error("Game is full.");

        // Assign Random Faction
        const takenFactions = state.factions.map(f => f.faction);
        const allFactions = Object.values(Faction).filter(f => f !== Faction.None);
        const availableFactions = allFactions.filter(f => !takenFactions.includes(f));

        if (availableFactions.length === 0) throw new Error("No factions available.");

        const randomFaction = sample(availableFactions);

        const newFaction: FactionState = {
            faction: randomFaction,
            playerDiscordId: userId,
            playerName: username,
            spice: 0,
            reserves: 0,
            traitors: [],
            hand: []
        };

        state.factions.push(newFaction);
        state.actionLog.push(`Player ${username} joined as ${randomFaction}.`);

        await prisma.game.update({
            where: { id: gameId },
            data: { stateJson: JSON.stringify(state) }
        });

        return `Joined as ${randomFaction}`;
    }

    async startGame(gameId: number) {
        const game = await prisma.game.findUnique({ where: { id: gameId } });
        if (!game) throw new Error("Game not found.");

        const state = JSON.parse(game.stateJson) as GameState;

        if (state.phase !== "Setup") throw new Error("Game already started.");
        if (state.factions.length < 1) throw new Error("Not enough players.");

        // 1. Initial Resources
        state.factions.forEach(f => {
            f.spice = 10;
            f.reserves = 10;
        });

        // 2. Initialize Storm
        state.stormLocation = Math.floor(Math.random() * 18) + 1;

        // 3. Deal Traitors (Simplified: Just assign random cards as traitors for now)
        // In real impl, we need a deck system.
        // For MVP, we will fetch cards from DB and assign random ones
        const allCards = await prisma.treacheryCard.findMany();
        if (allCards.length > 0) {
            state.factions.forEach(f => {
                // Mock dealing
                const randomCard = sample<TreacheryCard>(allCards);
                f.traitors.push(randomCard.name);
            });
        }

        // 4. Update Phase
        state.phase = "Storm";
        state.turn = 1;
        state.actionLog.push(`Game Started! Storm is at Sector ${state.stormLocation}.`);

        await prisma.game.update({
            where: { id: gameId },
            data: { stateJson: JSON.stringify(state) }
        });

        return state;
    }

    async advancePhase(gameId: number) {
        const game = await prisma.game.findUnique({ where: { id: gameId } });
        if (!game) throw new Error("Game not found.");

        const state = JSON.parse(game.stateJson) as GameState;

        const phases = ["Storm", "Spice Blow", "Bidding", "Movement", "Battle", "Collection"];
        const currentIdx = phases.indexOf(state.phase);

        let nextPhase = "Storm";
        if (currentIdx !== -1 && currentIdx < phases.length - 1) {
            nextPhase = phases[currentIdx + 1];
        } else {
            // New Turn
            state.turn++;
            state.actionLog.push(`Turn ${state.turn} Started.`);
        }

        state.phase = nextPhase;

        // Phase Triggers
        if (nextPhase === "Bidding") {
            const deck = await prisma.treacheryCard.findMany(); // Mock Deck
            this.biddingEngine.startBiddingPhase(state, deck);
        }

        state.actionLog.push(`Phase advanced to: ${nextPhase}`);

        await prisma.game.update({
            where: { id: gameId },
            data: { stateJson: JSON.stringify(state) }
        });

        return state;
    }

    async handleBid(gameId: number, userId: string, amount: number) {
        const game = await prisma.game.findUnique({ where: { id: gameId } });
        if (!game) throw new Error("Game not found.");
        const state = JSON.parse(game.stateJson) as GameState;

        this.biddingEngine.placeBid(state, userId, amount);

        await prisma.game.update({ where: { id: gameId }, data: { stateJson: JSON.stringify(state) } });
        return state;
    }

    async handlePass(gameId: number, userId: string) {
        const game = await prisma.game.findUnique({ where: { id: gameId } });
        if (!game) throw new Error("Game not found.");
        const state = JSON.parse(game.stateJson) as GameState;

        this.biddingEngine.passBid(state, userId);

        await prisma.game.update({ where: { id: gameId }, data: { stateJson: JSON.stringify(state) } });
        return state;
    }
}
