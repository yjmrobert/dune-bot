import { MapRenderer } from '../src/engine/MapRenderer';
import { GameState, Faction } from '../src/types';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
    console.log("Initializing Test...");

    const mockGameState: GameState = {
        phase: "Movement",
        turn: 1,
        stormLocation: 6, // Should be roughly Sietch Tabr / Habbanya area
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
        boardState: {
            "Hagga Basin": {
                name: "Hagga Basin",
                spice: 3,
                forces: {
                    [Faction.Atreides]: 10
                }
            },
            "The Great Flat": {
                name: "The Great Flat",
                spice: 12,
                forces: {
                    [Faction.Harkonnen]: 5
                }
            },
            "Old Gap": {
                name: "Old Gap",
                spice: 0,
                forces: {
                    [Faction.Fremen]: 15
                }
            },
            "Broken Land": {
                name: "Broken Land", // Testing another one
                spice: 6,
                forces: {
                    [Faction.Guild]: 2
                }
            }
        }
    };

    console.log("Creating Renderer...");
    const renderer = new MapRenderer();

    console.log("Rendering Board...");
    try {
        const buffer = await renderer.renderBoard(mockGameState);
        
        const outputPath = path.join(__dirname, '..', 'test-render.png');
        fs.writeFileSync(outputPath, buffer);
        console.log(`Success! Image saved to: ${outputPath}`);
    } catch (error) {
        console.error("Error rendering map:", error);
    }
}

main().catch(console.error);
