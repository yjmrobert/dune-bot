import { Territory } from "@prisma/client";
import { GameState, FactionState, TerritoryState, Faction } from "../types";
import { BoardService } from "../services/BoardService";

export class StormEngine {

    // Returns new storm location
    moveStorm(state: GameState, sectors: number, territories: Territory[]): number {
        let currentSector = state.stormLocation;

        for (let i = 0; i < sectors; i++) {
            currentSector++;
            if (currentSector > 18) currentSector = 1;
            
            // Log for final position is handled by caller or generic log? 
            // We should log destruction here effectively as it happens along the path
            this.resolveDestruction(state, currentSector, territories);
        }

        state.stormLocation = currentSector;
        state.actionLog.push(`Storm moved ${sectors} sectors to Sector ${state.stormLocation}.`);
        
        return currentSector;
    }

    private resolveDestruction(state: GameState, stormSector: number, allTerritories: Territory[]) {
        const sectorTerritories = allTerritories.filter(t => t.sector === stormSector);

        for (const territory of sectorTerritories) {
            const territoryName = territory.name;
            const territoryState = state.boardState[territoryName];
            
            if (!territoryState) continue;

            // Remove Spice (Happens in all sectors passed by storm, including Imperial Basin)
            if (territoryState.spice > 0) {
                state.actionLog.push(`Storm destroyed ${territoryState.spice} spice in ${territoryName}.`);
                territoryState.spice = 0;
            }

            // Remove Forces (Only in unsafe territories)
            // Imperial Basin is marked isSafe=true in DB, so it is skipped here
            if (!territory.isSafe) {
                const sectorForces = BoardService.getSectorForces(state, territoryName, stormSector);
                // We need to iterate a copy of keys or entries because we are mutating
                Object.keys(sectorForces).forEach(faction => {
                    const count = sectorForces[faction];
                    if (count > 0) {
                        state.actionLog.push(`Storm destroyed ${count} ${faction} forces in ${territoryName} (Sector ${stormSector}).`);
                        BoardService.removeForceFromSector(state, territoryName, stormSector, faction, count);
                        
                        // Send to Tanks
                        const factionState = state.factions.find(f => f.faction === faction);
                        if (factionState) {
                             factionState.forcesInTanks += count;
                             state.actionLog.push(`${count} ${faction} forces sent to Tleilaxu Tanks.`);
                        }
                    }
                });
            }
        }
    }

    determineFirstPlayer(state: GameState) {
        // Canonical Seat Positions (Standard Dune circle 1-18)
        // Spaced by 3 for 6 players: 1, 4, 7, 10, 13, 16.
        // Mapping based on Board Game Geek standard or logical spacing.
        // 1: Guild
        // 4: Emperor
        // 7: Bene Gesserit
        // 10: Atreides
        // 13: Harkonnen
        // 16: Fremen
        // Note: Rules say "Faction whose Player Marker the storm next approaches".
        // Storm moves CCW (18 -> 17). Seat 1 is next after 18? Or 18 is next after 1?
        // Let's assume Sectors 1-18.
        // Storm moves 1 -> 2 -> ... -> 18. (This is documented in Moves as increasing sector?)
        // Code: moveStorm does `currentSector++`. So Storm moves 1 -> 2 -> ... -> 18 -> 1.
        // This is CLOCKWISE on most boards? Or CCW?
        // Spec says "Storm moves counterclockwise".
        // Using `currentSector++` implies sectors are numbered Counter-Clockwise?
        // Let's assume Sector 1 is top, increasing CCW.
        // Then players at 1, 4, 7... are fixed.
        // "Approaches": If Storm is at 1, increasing to 2... it approaches 4.
        // So we look for the smallest POSITIVE distance in direction of movement.

        const SEAT_POSITIONS: Record<string, number> = {
            [Faction.Guild]: 1,
            [Faction.Emperor]: 4,
            [Faction.BeneGesserit]: 7,
            [Faction.Atreides]: 10,
            [Faction.Harkonnen]: 13,
            [Faction.Fremen]: 16
        };

        // Fallback for missing factions or duplicates
        const getSeat = (f: string) => SEAT_POSITIONS[f] || 1;

        let closestFaction = state.factions[0]?.playerDiscordId;
        let minDist = 999;

        // Iterate over playing factions
        for (const f of state.factions) {
            const pos = getSeat(f.faction);
            
            // Calc distance from Storm to Seat in direction of movement (Increasing)
            // Dist = Pos - Storm
            // If Pos > Storm: Easy (e.g. Storm 2, Pos 4 -> Dist 2)
            // If Pos < Storm: Wrap (e.g. Storm 17, Pos 1 -> (1+18) - 17 = 2)
            // If Pos == Storm: Next lap (e.g. Storm 1, Pos 1 -> Dist 18)
            
            let dist = pos - state.stormLocation;
            if (dist <= 0) dist += 18;

            if (dist < minDist) {
                minDist = dist;
                closestFaction = f.playerDiscordId;
            } else if (dist === minDist) {
                // Tie breaker? Seat priority?
                // Standard game doesn't usually have ties if seats unique.
                // If mocked state has duplicate factions/seats, pick first.
            }
        }

        if (closestFaction) {
            state.firstPlayerId = closestFaction;
            state.actionLog.push(`First Player is now ${state.factions.find(f => f.playerDiscordId === closestFaction)?.playerName}.`);
        }
    }
}
