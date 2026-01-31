"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameEngine = void 0;
const db_1 = require("../db");
const types_1 = require("../types");
const BiddingEngine_1 = require("./BiddingEngine");
const ChoamCharityEngine_1 = require("./ChoamCharityEngine");
const RevivalEngine_1 = require("./RevivalEngine");
const ShipmentMovementEngine_1 = require("./ShipmentMovementEngine");
const BattleEngine_1 = require("./BattleEngine");
const SpiceCollectionEngine_1 = require("./SpiceCollectionEngine");
const MentatPauseEngine_1 = require("./MentatPauseEngine");
const leaders_1 = require("../constants/leaders");
const BoardService_1 = require("../services/BoardService");
// Utility to get random item from array
function sample(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}
class GameEngine {
    biddingEngine = new BiddingEngine_1.BiddingEngine();
    revivalEngine = new RevivalEngine_1.RevivalEngine();
    shipmentEngine = new ShipmentMovementEngine_1.ShipmentMovementEngine();
    battleEngine = new BattleEngine_1.BattleEngine();
    spiceCollectionEngine = new SpiceCollectionEngine_1.SpiceCollectionEngine();
    mentatPauseEngine = new MentatPauseEngine_1.MentatPauseEngine();
    async registerPlayer(gameId, userId, username) {
        const game = await db_1.prisma.game.findUnique({ where: { id: gameId } });
        if (!game)
            throw new Error("Game not found.");
        const state = JSON.parse(game.stateJson);
        if (state.phase !== "Setup")
            throw new Error("Cannot join game in progress.");
        if (state.factions.some(f => f.playerDiscordId === userId))
            throw new Error("Player already joined.");
        if (state.factions.length >= 6)
            throw new Error("Game is full.");
        // Assign Random Faction
        const takenFactions = state.factions.map(f => f.faction);
        const allFactions = Object.values(types_1.Faction).filter(f => f !== types_1.Faction.None);
        const availableFactions = allFactions.filter(f => !takenFactions.includes(f));
        if (availableFactions.length === 0)
            throw new Error("No factions available.");
        const randomFaction = sample(availableFactions);
        const newFaction = {
            faction: randomFaction,
            playerDiscordId: userId,
            playerName: username,
            spice: 0,
            reserves: 0,
            forcesInTanks: 0,
            leaders: leaders_1.FACTION_LEADERS[randomFaction].map(l => ({ ...l, isDead: false })),
            traitors: [],
            hand: []
        };
        state.factions.push(newFaction);
        state.actionLog.push(`Player ${username} joined as ${randomFaction}.`);
        await db_1.prisma.game.update({
            where: { id: gameId },
            data: { stateJson: JSON.stringify(state) }
        });
        return { result: `Joined as ${randomFaction}`, state, game };
    }
    async startGame(gameId) {
        const game = await db_1.prisma.game.findUnique({ where: { id: gameId } });
        if (!game)
            throw new Error("Game not found.");
        const state = JSON.parse(game.stateJson);
        if (state.phase !== "Setup")
            throw new Error("Game already started.");
        if (state.factions.length < 1)
            throw new Error("Not enough players.");
        // 1. Initial Resources
        state.factions.forEach(f => {
            f.spice = 10;
            f.reserves = 10;
        });
        // 2. Initialize Storm
        state.stormLocation = Math.floor(Math.random() * 18) + 1;
        // 3. Deal Traitors & Initialize Decks
        const allTreacheryCards = await db_1.prisma.treacheryCard.findMany();
        const allSpiceCards = await db_1.prisma.spiceCard.findMany();
        // Shuffle Helper
        const shuffle = (array) => {
            for (let i = array.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [array[i], array[j]] = [array[j], array[i]];
            }
            return array;
        };
        state.treacheryDeck = shuffle([...allTreacheryCards]);
        state.treacheryDiscard = [];
        state.spiceDeck = shuffle([...allSpiceCards]);
        state.spiceDiscard = [];
        if (state.treacheryDeck.length > 0) {
            state.factions.forEach(f => {
                // Deal 4 Traitors to each player -> they will keep 1 later, but for now just deal 4
                // According to rules: Check "Traitor" phase or setup. 
                // Usually: Deal 4 to each, keep 1, shuffle rest back.
                // Simplified for MVP: Deal 4 random ones from deck?
                // Actually, let's just deal 1 for now to match the "mock" logic but use the deck.
                // Or better: Deal 4.
                // Let's stick to the previous simple logic but use the real deck:
                // "Pull" from deck
                const card = state.treacheryDeck.pop();
                if (card) {
                    f.traitors.push(card.name);
                }
            });
        }
        // 4. Update Phase
        state.phase = "Storm";
        state.turn = 1;
        state.actionLog.push(`Game Started! Storm is at Sector ${state.stormLocation}.`);
        await db_1.prisma.game.update({
            where: { id: gameId },
            data: { stateJson: JSON.stringify(state) }
        });
        return { state, game };
    }
    async advancePhase(gameId) {
        const game = await db_1.prisma.game.findUnique({ where: { id: gameId } });
        if (!game)
            throw new Error("Game not found.");
        const state = JSON.parse(game.stateJson);
        const phases = ["Storm", "Spice Blow", "CHOAM Charity", "Bidding", "Revival", "Shipment and Movement", "Battle", "Collection"];
        const currentIdx = phases.indexOf(state.phase);
        let nextPhase = "Storm";
        if (currentIdx !== -1 && currentIdx < phases.length - 1) {
            nextPhase = phases[currentIdx + 1];
        }
        else {
            // New Turn
            state.turn++;
            state.actionLog.push(`Turn ${state.turn} Started.`);
        }
        state.phase = nextPhase;
        // Phase Triggers
        if (nextPhase === "CHOAM Charity") {
            const choamEngine = new ChoamCharityEngine_1.ChoamCharityEngine(); // Instantiate locally or move to class property
            const messages = choamEngine.processCharity(state);
            state.actionLog.push(...messages);
            // Auto-advance to Bidding immediately since Charity is automatic
            // Recursively call advancePhase or just set phase to Bidding?
            // "Bidding" is next in list. If we want auto-advance, we should just continue logic.
            // But advancePhase is called BY a user action typically or system tick.
            // If we want it automatic, we can just call this.advancePhase again?
            // Be careful of recursion depth or saving state intermediate.
            // For MVP: Let's just let it settle in "CHOAM Charity" and let the next action trigger next phase?
            // OR: Since the plan said "Auto-advance", let's fulfill that.
            // We can just set nextPhase to Bidding directly here IF we want to skip the "Wait in CHOAM Phase" state.
            // But let's stick to the phase loop. We will process charity, save, and THEN maybe return or trigger next.
            // Actually, if we want to auto-advance, we should arguably just do the logic and NOT stop at "CHOAM Charity" in the `phases` array?
            // No, keeping it as a phase is better for structure.
            // Let's just process it. The USER (or system) will call advancePhase again?
            // The prompt/plan said "Auto-advance to Bidding after charity is applied".
            // Let's implement auto-advance by calling it again.
            // We need to save state first though.
            await db_1.prisma.game.update({
                where: { id: gameId },
                data: { stateJson: JSON.stringify(state) }
            });
            return this.advancePhase(gameId); // Recursive call to move to Bidding
        }
        if (nextPhase === "Bidding") {
            const deck = await db_1.prisma.treacheryCard.findMany(); // Mock Deck
            this.biddingEngine.startBiddingPhase(state, deck);
        }
        state.actionLog.push(`Phase advanced to: ${nextPhase}`);
        await db_1.prisma.game.update({
            where: { id: gameId },
            data: { stateJson: JSON.stringify(state) }
        });
        return state;
    }
    async handleBid(gameId, userId, amount) {
        const game = await db_1.prisma.game.findUnique({ where: { id: gameId } });
        if (!game)
            throw new Error("Game not found.");
        const state = JSON.parse(game.stateJson);
        this.biddingEngine.placeBid(state, userId, amount);
        await db_1.prisma.game.update({ where: { id: gameId }, data: { stateJson: JSON.stringify(state) } });
        return state;
    }
    async handlePass(gameId, userId) {
        const game = await db_1.prisma.game.findUnique({ where: { id: gameId } });
        if (!game)
            throw new Error("Game not found.");
        const state = JSON.parse(game.stateJson);
        this.biddingEngine.passBid(state, userId);
        await db_1.prisma.game.update({ where: { id: gameId }, data: { stateJson: JSON.stringify(state) } });
        return state;
    }
    async reviveForces(gameId, userId, count) {
        const game = await db_1.prisma.game.findUnique({ where: { id: gameId } });
        if (!game)
            throw new Error("Game not found.");
        const state = JSON.parse(game.stateJson);
        this.revivalEngine.reviveForces(state, userId, count);
        await db_1.prisma.game.update({ where: { id: gameId }, data: { stateJson: JSON.stringify(state) } });
        return state;
    }
    async reviveLeader(gameId, userId, leaderName) {
        const game = await db_1.prisma.game.findUnique({ where: { id: gameId } });
        if (!game)
            throw new Error("Game not found.");
        const state = JSON.parse(game.stateJson);
        this.revivalEngine.reviveLeader(state, userId, leaderName);
        await db_1.prisma.game.update({ where: { id: gameId }, data: { stateJson: JSON.stringify(state) } });
        return state;
    }
    async shipForces(gameId, userId, territoryName, sector, count) {
        const game = await db_1.prisma.game.findUnique({ where: { id: gameId } });
        if (!game)
            throw new Error("Game not found.");
        const state = JSON.parse(game.stateJson);
        this.shipmentEngine.shipForces(state, userId, territoryName, sector, count);
        await db_1.prisma.game.update({ where: { id: gameId }, data: { stateJson: JSON.stringify(state) } });
        return state;
    }
    async moveForces(gameId, userId, fromTerritory, toTerritory, count) {
        const game = await db_1.prisma.game.findUnique({ where: { id: gameId } });
        if (!game)
            throw new Error("Game not found.");
        const state = JSON.parse(game.stateJson);
        this.shipmentEngine.moveForces(state, userId, fromTerritory, toTerritory, count);
        await db_1.prisma.game.update({ where: { id: gameId }, data: { stateJson: JSON.stringify(state) } });
        return state;
    }
    async initiateBattle(gameId, territoryName) {
        const game = await db_1.prisma.game.findUnique({ where: { id: gameId } });
        if (!game)
            throw new Error("Game not found.");
        const state = JSON.parse(game.stateJson);
        // Identify combatants
        // Identify combatants
        // Identify combatants
        const forces = BoardService_1.BoardService.getForces(state, territoryName);
        const participants = Object.keys(forces).filter(f => forces[f] > 0);
        if (participants.length < 2)
            throw new Error("Not enough factions for battle.");
        // Simple logic: First 2 are fighting. 
        // Real logic: Aggressor is current turn player. Defender is... well, depends on who they moved into.
        // For MVP Test: Pass simple args or infer.
        // Let's assume Step Definition sets it up or we infer from participants.
        // But `BattleEngine.initiateBattle` takes IDs.
        // Let's grab first two.
        const discordIds = participants.map(fname => state.factions.find(f => f.faction === fname)?.playerDiscordId).filter(id => !!id);
        this.battleEngine.initiateBattle(state, territoryName, discordIds[0], discordIds[1]);
        await db_1.prisma.game.update({ where: { id: gameId }, data: { stateJson: JSON.stringify(state) } });
        return state;
    }
    async submitBattlePlan(gameId, userId, plan) {
        const game = await db_1.prisma.game.findUnique({ where: { id: gameId } });
        if (!game)
            throw new Error("Game not found.");
        const state = JSON.parse(game.stateJson);
        this.battleEngine.submitBattlePlan(state, userId, plan);
        await db_1.prisma.game.update({ where: { id: gameId }, data: { stateJson: JSON.stringify(state) } });
        return state;
    }
    async resolveSpiceCollection(gameId) {
        const game = await db_1.prisma.game.findUnique({ where: { id: gameId } });
        if (!game)
            throw new Error("Game not found.");
        const state = JSON.parse(game.stateJson);
        this.spiceCollectionEngine.resolveCollection(state);
        await db_1.prisma.game.update({ where: { id: gameId }, data: { stateJson: JSON.stringify(state) } });
        await db_1.prisma.game.update({ where: { id: gameId }, data: { stateJson: JSON.stringify(state) } });
        return state;
    }
    async resolveMentatPause(gameId) {
        const game = await db_1.prisma.game.findUnique({ where: { id: gameId } });
        if (!game)
            throw new Error("Game not found.");
        const state = JSON.parse(game.stateJson);
        this.mentatPauseEngine.resolveMentatPause(state);
        await db_1.prisma.game.update({ where: { id: gameId }, data: { stateJson: JSON.stringify(state) } });
        return state;
    }
}
exports.GameEngine = GameEngine;
