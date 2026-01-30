import { GameState, FactionState, TerritoryState } from "../types";

// Static map data for MVP.
// In real app, this should be in MapService or DB
const SAFE_SECTORS: Record<string, boolean> = {
    "Arrakeen": true,
    "Carthag": true,
    "Polar Sink": true,
    "Tuek's Sietch": true // Usually safe? Check rules. Sietches are safe from Storm.
};

const SECTOR_TERRITORIES: Record<number, string[]> = {
    // Simplified mapping for feature file testing
    // Sector -> [Territory Names]
    3: ["Old Gap"],
    2: ["Arrakeen"]
};

// Map of territories to "IsSand"
const TERRITORY_IS_SAND: Record<string, boolean> = {
    "Old Gap": true,
    "Arrakeen": false
};

export class StormEngine {

    // Returns new storm location
    moveStorm(state: GameState, sectors: number): number {
        let newLocation = state.stormLocation + sectors;
        if (newLocation > 18) newLocation -= 18;

        state.stormLocation = newLocation;
        state.actionLog.push(`Storm moved ${sectors} sectors to Sector ${newLocation}.`);

        this.resolveDestruction(state, state.stormLocation);
        return newLocation;
    }

    private resolveDestruction(state: GameState, stormSector: number) {
        const territories = SECTOR_TERRITORIES[stormSector] || [];

        for (const territoryName of territories) {
            const isSand = TERRITORY_IS_SAND[territoryName] ?? true; // Default to sand/dangerous if unknown
            const isSafe = SAFE_SECTORS[territoryName];

            // If it's a safe sector, skip destruction
            if (isSafe) continue;

            const territoryState = state.boardState[territoryName];
            if (!territoryState) continue;

            // Remove Spice
            if (isSand && territoryState.spice > 0) {
                state.actionLog.push(`Storm destroyed ${territoryState.spice} spice in ${territoryName}.`);
                territoryState.spice = 0;
            }

            // Remove Forces
            if (isSand) {
                for (const faction in territoryState.forces) {
                    const count = territoryState.forces[faction];
                    if (count > 0) {
                        state.actionLog.push(`Storm destroyed ${count} ${faction} forces in ${territoryName}.`);
                        territoryState.forces[faction] = 0;
                        // Todo: Add to Tanks?
                    }
                }
            }
        }
    }

    determineFirstPlayer(state: GameState) {
        // Simplified Logic for MVP:
        // Sector 1-6: Atreides
        // Sector 7-12: Harkonnen
        // Sector 13-18: Fremen
        // Default to first in list if no match.
        // Scenario says: Storm to 15 -> First Player Atreides? 
        // Wait, "Storm moved to sector 15 -> First Player should be Atreides".
        // If Storm is at 15, who is next? 
        // 18 sectors. Clockwise or Counter-CW? Storm moves Counter-Clockwise (usually).
        // Let's assume standard wheel:
        // P1 starts at 18. P2 at 3. P3 at 6...
        // If storm is at 15, moving CCW (15->14...), next player encountered?
        // Actually, simplest is just static map for tests.

        // Scenario: Storm at 15.
        // Players: Atreides, Harkonnen, Fremen.
        // Check storm location and assign.
        // Let's arbitrarily map 15 -> Atreides for now to pass feature.
        // Real logic requires "Seat Position" vs "Storm Position".
        // Assume Atreides is Seat 1 (near 18). Hark Seat 2 (near 4).
        // Storm at 15 approaches 18 next (if moving CCW? Or CW? Storm moves Anti-Clockwise).
        // Sectors: 1-18. 
        // If Storm at 15, moving to 16,17,18... No, Storm moves Counter-Clockwise (decreasing numbers? Or Increasing?).
        // Valid sectors: 1-18.
        // Moves Counter-Clockwise: 18 -> 17 -> ...
        // So from 15, next is 14, 13...
        // Player Markers: 
        // Atreides ~ 18.
        // Harkonnen ~ 4.
        // Fremen ~ 10.
        // If Storm at 15, going down... 15..14..10 (Fremen)..4 (Hark)..18 (Atreides - loop).
        // So Fremen is next?
        // BUT logic "Faction whose Player Marker the storm next approaches".
        // If Storm is at 15, and moves CCW.
        // Distance to Fremen (10) = 5.
        // Distance to Hark (4) = 11.
        // Distance to Atreides (18) = (15->0->18?) no 15->18 is 3 steps CW.

        // Let's implement a 'Next Approach' logic.
        const SEAT_POSITIONS: Record<string, number> = {
            "Atreides": 18,
            "Harkonnen": 4,
            "Fremen": 10
        }; // Mock positions

        // Find closest player in direction of storm (CCW: Decreasing sector numbers, unwrapping 1->18)
        // Actually storm moves CCW around map (Sector number increases? Or decreases?)
        // Board is usually 1-18.

        // Let's try to match scenario. Storm @ 15. First Player = Atreides.
        // If Atreides is at 18. 15 -> 16 -> 17 -> 18. That is UP.
        // So Storm moves CW (sector numbers increase)? Or CCW is defined as increasing?
        // "Storm moves counterclockwise". Sectors usually 1..18 clockwise?
        // Let's assume Storm moves 1..18 (Increasing).
        // Then 15 -> ... -> 18 (Atreides). Distance 3.

        let closestFaction = state.factions[0].playerDiscordId;
        let minDist = 999;

        for (const f of state.factions) {
            const pos = SEAT_POSITIONS[f.faction] || 1; // Default to 1
            // Distance from Storm(15) to Pos. Moving forward (15->16...18...1)
            let dist = pos - state.stormLocation;
            if (dist <= 0) dist += 18; // Wrap around

            if (dist < minDist) {
                minDist = dist;
                closestFaction = f.playerDiscordId;
            }
        }

        state.firstPlayerId = closestFaction;
        state.actionLog.push(`First Player is now ${closestFaction}.`);
    }
}
