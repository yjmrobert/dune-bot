import { GameState, Faction, FactionState, TreacheryCard, SpiceCard, BattlePlan } from "../types";
import { BiddingEngine } from "./BiddingEngine";
import { ChoamCharityEngine } from "./ChoamCharityEngine";
import { RevivalEngine } from "./RevivalEngine";
import { ShipmentMovementEngine } from "./ShipmentMovementEngine";
import { BattleEngine } from "./BattleEngine";
import { SpiceCollectionEngine } from "./SpiceCollectionEngine";
import { MentatPauseEngine } from "./MentatPauseEngine";
import { StormEngine } from "./StormEngine";
import { SpiceBlowEngine } from "./SpiceBlowEngine";
import { FACTION_LEADERS } from "../constants/leaders";
import { BoardService } from "../services/BoardService";
import { PhaseHandler } from "./phases/PhaseHandler";
import { SetupPhaseHandler } from "./phases/SetupPhaseHandler";
import { StormPhaseHandler } from "./phases/StormPhaseHandler";
import { SpiceBlowPhaseHandler } from "./phases/SpiceBlowPhaseHandler";
import { ChoamCharityPhaseHandler } from "./phases/ChoamCharityPhaseHandler";
import { BiddingPhaseHandler } from "./phases/BiddingPhaseHandler";
import { RevivalPhaseHandler } from "./phases/RevivalPhaseHandler";
import { ShipmentAndMovementPhaseHandler } from "./phases/ShipmentAndMovementPhaseHandler";
import { BattlePhaseHandler } from "./phases/BattlePhaseHandler";
import { SpiceCollectionPhaseHandler } from "./phases/SpiceCollectionPhaseHandler";
import { MentatPausePhaseHandler } from "./phases/MentatPausePhaseHandler";
import { GameAction } from "../types";

// Utility to get random item from array
function sample<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

export class GameEngine {
    private biddingEngine = new BiddingEngine();
    private revivalEngine = new RevivalEngine();
    private shipmentEngine = new ShipmentMovementEngine();
    private battleEngine = new BattleEngine();
    private spiceCollectionEngine = new SpiceCollectionEngine();
    private mentatPauseEngine = new MentatPauseEngine();
    private stormEngine = new StormEngine();
    private spiceBlowEngine = new SpiceBlowEngine();

    private phaseHandlers: Record<string, PhaseHandler>;
    private defaultHandler: PhaseHandler;

    constructor() {
        this.phaseHandlers = {
            "Setup": new SetupPhaseHandler(),
            "Storm": new StormPhaseHandler(),
            "Spice Blow": new SpiceBlowPhaseHandler(),
            "CHOAM Charity": new ChoamCharityPhaseHandler(),
            "Bidding": new BiddingPhaseHandler(this.biddingEngine),
            "Revival": new RevivalPhaseHandler(this.revivalEngine),
            "Shipment and Movement": new ShipmentAndMovementPhaseHandler(this.shipmentEngine),
            "Battle": new BattlePhaseHandler(this.battleEngine),
            "Collection": new SpiceCollectionPhaseHandler(this.spiceCollectionEngine),
            "Mentat Pause": new MentatPausePhaseHandler(this.mentatPauseEngine)
        };
        this.defaultHandler = new StormPhaseHandler(); // Fallback
    }

    getAvailableActions(state: GameState): GameAction[] {
        const handler = this.phaseHandlers[state.phase] || this.defaultHandler;
        return handler.getAvailableActions(state);
    }

    registerPlayer(state: GameState, userId: string, username: string): GameState {
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
            forcesInTanks: 0,
            leaders: FACTION_LEADERS[randomFaction].map(l => ({ ...l, isDead: false })),
            traitors: [],
            hand: []
        };

        state.factions.push(newFaction);
        state.actionLog.push(`Player ${username} joined as ${randomFaction}.`);

        return state;
    }

    startGame(state: GameState, treacheryCards: TreacheryCard[], spiceCards: SpiceCard[]): GameState {
        if (state.phase !== "Setup") throw new Error("Game already started.");
        if (state.factions.length < 1) throw new Error("Not enough players.");

        // 1. Initial Resources
        // 1. Initial Resources & Forces
        this.setupStartingForces(state);

        // 2. Initialize Storm
        state.stormLocation = Math.floor(Math.random() * 18) + 1;

        // 3. Deal Traitors & Initialize Decks
        // Shuffle Helper
        const shuffle = <T>(array: T[]) => {
            for (let i = array.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [array[i], array[j]] = [array[j], array[i]];
            }
            return array;
        };

        state.treacheryDeck = shuffle([...treacheryCards]);
        state.treacheryDiscard = [];
        state.spiceDeck = shuffle([...spiceCards] as any);
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

        return state;
    }

    advancePhase(state: GameState): GameState {
        const phases = ["Storm", "Spice Blow", "CHOAM Charity", "Bidding", "Revival", "Shipment and Movement", "Battle", "Collection"];
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

        // Reset storm moved flag when entering Storm phase
        if (nextPhase === "Storm") {
            state.stormMovedThisTurn = false;
        }

        // Reset spice blow flag when entering Spice Blow phase
        if (nextPhase === "Spice Blow") {
            state.spiceBlowRevealed = false;
        }

        // Phase Triggers
        if (nextPhase === "CHOAM Charity") {
            const choamEngine = new ChoamCharityEngine(); // Instantiate locally or move to class property
            const messages = choamEngine.processCharity(state);
            state.actionLog.push(...messages);

            // Auto-advance to Bidding
            return this.advancePhase(state); // Recursive call to move to Bidding
        }

        if (nextPhase === "Bidding") {
            // Need deck for bidding start
            // Assuming deck is in state.treacheryDeck
            this.biddingEngine.startBiddingPhase(state, state.treacheryDeck || []);
        }

        state.actionLog.push(`Phase advanced to: ${nextPhase}`);

        return state;
    }

    handleBid(state: GameState, userId: string, amount: number): GameState {
        this.biddingEngine.placeBid(state, userId, amount);
        return state;
    }

    handlePass(state: GameState, userId: string): GameState {
        this.biddingEngine.passBid(state, userId);
        return state;
    }

    reviveForces(state: GameState, userId: string, count: number): GameState {
        this.revivalEngine.reviveForces(state, userId, count);
        return state;
    }

    reviveLeader(state: GameState, userId: string, leaderName: string): GameState {
        this.revivalEngine.reviveLeader(state, userId, leaderName);
        return state;
    }

    shipForces(state: GameState, userId: string, territoryName: string, sector: number, count: number): GameState {
        this.shipmentEngine.shipForces(state, userId, territoryName, sector, count);
        return state;
    }

    moveForces(state: GameState, userId: string, fromTerritory: string, toTerritory: string, count: number): GameState {
        this.shipmentEngine.moveForces(state, userId, fromTerritory, toTerritory, count);
        return state;
    }

    initiateBattle(state: GameState, territoryName: string): GameState {
        // Identify combatants
        const forces = BoardService.getForces(state, territoryName);
        const participants = Object.keys(forces).filter(f => forces[f] > 0);
        if (participants.length < 2) throw new Error("Not enough factions for battle.");

        const discordIds = participants.map(fname => state.factions.find(f => f.faction === fname)?.playerDiscordId).filter(id => !!id) as string[];

        this.battleEngine.initiateBattle(state, territoryName, discordIds[0], discordIds[1]);
        return state;
    }

    submitBattlePlan(state: GameState, userId: string, plan: BattlePlan): GameState {
        this.battleEngine.submitBattlePlan(state, userId, plan);
        return state;
    }

    resolveSpiceCollection(state: GameState): GameState {
        this.spiceCollectionEngine.resolveCollection(state);
        return state;
    }

    resolveMentatPause(state: GameState): GameState {
        this.mentatPauseEngine.resolveMentatPause(state);
        return state;
    }

    moveStorm(state: GameState, sectors: number): GameState {
        this.stormEngine.moveStorm(state, sectors);
        this.stormEngine.determineFirstPlayer(state);
        state.stormMovedThisTurn = true;
        return state;
    }

    revealSpiceBlow(state: GameState): GameState {
        this.spiceBlowEngine.resolveSpiceBlow(state);
        state.spiceBlowRevealed = true;
        return state;
    }

    private setupStartingForces(state: GameState) {
        state.factions.forEach(f => {
            switch (f.faction) {
                case Faction.Atreides:
                    f.spice = 10;
                    f.reserves = 10;
                    BoardService.addForce(state, "Arrakeen", 10, f.faction, 10);
                    break;
                case Faction.Harkonnen:
                    f.spice = 10;
                    f.reserves = 10;
                    BoardService.addForce(state, "Carthag", 11, f.faction, 10);
                    break;
                case Faction.Fremen:
                    f.spice = 3;
                    f.reserves = 10;
                    // Default to Sietch Tabr (Sector 14)
                    BoardService.addForce(state, "Sietch Tabr", 14, f.faction, 10);
                    break;
                case Faction.Emperor:
                    f.spice = 10;
                    f.reserves = 20;
                    break;
                case Faction.Guild:
                    f.spice = 5;
                    f.reserves = 15;
                    BoardService.addForce(state, "Tuek's Sietch", 5, f.faction, 5);
                    break;
                case Faction.BeneGesserit:
                    f.spice = 5;
                    f.reserves = 19;
                    // Polar Sink. Using Sector 0 if not defined.
                    BoardService.addForce(state, "Polar Sink", 0, f.faction, 1);
                    break;
            }
            state.actionLog.push(`${f.faction} starting forces deployed.`);
        });
    }
}
