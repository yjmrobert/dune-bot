import { GameState, SpiceCard, TerritoryState } from "../types";
import { BoardService } from "../services/BoardService";

export class SpiceBlowEngine {

    resolveSpiceBlow(state: GameState, nextCardOverride?: SpiceCard, shaiHuludSetAside: SpiceCard[] = []): void {
        if (!state.spiceDeck) state.spiceDeck = []; // Safety
        if (!state.spiceDiscard) state.spiceDiscard = [];

        // For testing, we might override the "next card"
        const card = nextCardOverride || state.spiceDeck.shift();

        if (!card) {
            state.actionLog.push("Spice Deck is empty.");
            return;
        }

        // FIRST TURN RULE: Ignore Shai-Hulud cards
        if (card.type === "Shai-Hulud" && state.turn === 1) {
            state.actionLog.push(`Shai-Hulud card set aside (First Turn).`);
            const isTopLevelCall = shaiHuludSetAside.length === 0;
            shaiHuludSetAside.push(card);
            
            // Continue drawing until we get a territory
            if (state.spiceDeck.length > 0) {
                this.resolveSpiceBlow(state, undefined, shaiHuludSetAside);
            } else {
                state.actionLog.push("No more cards in deck.");
            }
            
            // Reshuffle set-aside cards back into deck ONLY at top level
            if (isTopLevelCall && shaiHuludSetAside.length > 0) {
                state.spiceDeck.push(...shaiHuludSetAside);
                // Shuffle the deck
                for (let i = state.spiceDeck.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [state.spiceDeck[i], state.spiceDeck[j]] = [state.spiceDeck[j], state.spiceDeck[i]];
                }
                state.actionLog.push(`${shaiHuludSetAside.length} Shai-Hulud card(s) reshuffled into deck.`);
            }
            return;
        }

        state.spiceDiscard.push(card);
        state.actionLog.push(`Spice Card Turned: ${card.name}`);

        if (card.type === "Shai-Hulud") {
            this.handleShaiHulud(state);
            // Draw again? Logic says "Then another card is turned over."
            // We should loop or recurse, but careful of infinite loops in testing if deck empty.
            // For MVP: recursive call.

            // Check if deck has cards left (or we provided override - wait, override is single card)
            // If testing, we might need to handle "Next Card B" logic.
            // The step definition will likely call this multiple times or setup the deck.
            // But real logic is: Draw UNTIL territory.

            // Real recursion:
            if (state.spiceDeck.length > 0) {
                this.resolveSpiceBlow(state);
            }
        } else {
            this.handleTerritory(state, card);
        }
    }

    private handleTerritory(state: GameState, card: SpiceCard) {
        const territoryName = card.name;
        // Check Storm
        // Need mapping of Territory -> Sectors
        // For MVP, if card has sector? 
        // Feature: "The Great Flat" (Sector 8) is in the storm (Sector 8)
        // We'll rely on card.sector or a map util.
        const sector = card.sector || 0; // Default

        // If storm blocks
        // Assumption: If storm is AT the sector.
        // Storm logic: "Forces in a sector of sand territory... cannot move... spice removed"
        // Spice Blow: "If the Spice Blow icon is currently in storm, no spice is placed"

        // Simple check:
        // Simple check:
        if (BoardService.isInStorm(state, territoryName)) {
            state.actionLog.push(`Spice Blow in ${territoryName} obstructed by Storm.`);
            return;
        }

        // Add Spice
        if (!state.boardState[territoryName]) {
            state.boardState[territoryName] = { name: territoryName, spice: 0, forces: {} };
        }

        const amount = card.amount || 6;
        state.boardState[territoryName].spice += amount;
        state.actionLog.push(`${amount} spice appeared in ${territoryName}.`);
    }

    private handleShaiHulud(state: GameState) {
        state.actionLog.push(`Shai-Hulud!`);

        // Nexus Check
        if (state.turn > 1) {
            state.nexusActive = true;
            state.actionLog.push("Nexus Occurred!");
        }

        // Check Discard Pile for previous territory
        // "All spice and forces in the territory shown on the card now face up in the discard pile are removed"
        // The discard pile has Shai-Hulud on TOP. The one below it is the "previous" face up pile?
        // Rules: "Then the Shai-Hulud card is placed face up on the Spice Deck discard pile."
        // Wait, "territory shown on the card now face up in the discard pile".
        // Example: Territory A is top. Draw Shai-Hulud.
        // Shai-Hulud is revealed.
        // We look at Territory A (which is now under Shai-Hulud? Or we look before placing?).
        // "The top card of the Spice Deck is turned over... If Shai-Hulud appears... All spice... in territory shown on card NOW FACE UP in discard pile..."
        // So effectively the previous card.

        // In my code: I pushed Shai-Hulud to discard first.
        // So look at index - 2.

        if (state.spiceDiscard.length >= 2) {
            const previousCard = state.spiceDiscard[state.spiceDiscard.length - 2];
            if (previousCard.type === "Territory") {
                this.clearTerritory(state, previousCard.name);
            }
        }
    }

    private clearTerritory(state: GameState, territoryName: string) {
        const tState = state.boardState[territoryName];
        if (tState) {
            // Remove Spice
            if (tState.spice > 0) {
                state.actionLog.push(`Shai-Hulud devoured ${tState.spice} spice in ${territoryName}.`);
                tState.spice = 0;
            }
            // Remove Forces
            const forces = BoardService.getForces(state, territoryName);
            Object.keys(forces).forEach(f => {
                const count = forces[f];
                if (count > 0) {
                    state.actionLog.push(`Shai-Hulud devoured ${count} ${f} forces in ${territoryName}.`);
                    BoardService.removeForce(state, territoryName, f, count);
                }
            });
        }
    }
}
