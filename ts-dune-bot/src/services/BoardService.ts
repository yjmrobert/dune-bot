import { GameState } from "../types";
import { BOARD_MAP } from "../constants/map";

export class BoardService {
    // --- Queries ---

    /**
     * Returns aggregated forces per faction in a territory (summed across all sectors).
     */
    static getForces(state: GameState, territory: string): Record<string, number> {
        const tState = state.boardState[territory];
        if (!tState || !tState.forces) return {};

        const aggregated: Record<string, number> = {};
        Object.values(tState.forces).forEach(sectorForces => {
            Object.keys(sectorForces).forEach(faction => {
                const count = sectorForces[faction] || 0;
                if (count > 0) {
                    aggregated[faction] = (aggregated[faction] || 0) + count;
                }
            });
        });
        return aggregated;
    }

    /**
     * Returns forces in a specific sector.
     */
    static getSectorForces(state: GameState, territory: string, sector: number): Record<string, number> {
        const tState = state.boardState[territory];
        if (!tState || !tState.forces || !tState.forces[sector]) return {};
        return tState.forces[sector];
    }

    /**
     * Checks if a faction has any forces in the territory.
     */
    static hasForce(state: GameState, territory: string, faction: string): boolean {
        const forces = this.getForces(state, territory);
        return (forces[faction] || 0) > 0;
    }

    /**
     * Returns the faction controlling the territory (sole occupier).
     * Returns null if contested or empty.
     */
    static getController(state: GameState, territory: string): string | null {
        const forces = this.getForces(state, territory);
        const occupiers = Object.keys(forces).filter(f => forces[f] > 0);
        if (occupiers.length === 1) {
            return occupiers[0];
        }
        return null;
    }

    // --- Mutations ---

    /**
     * Adds forces to a specific sector.
     */
    static addForce(state: GameState, territory: string, sector: number, faction: string, count: number): void {
        if (!state.boardState[territory]) {
            state.boardState[territory] = { name: territory, spice: 0, forces: {} };
        }
        const tState = state.boardState[territory];

        if (!tState.forces[sector]) {
            tState.forces[sector] = {};
        }
        tState.forces[sector][faction] = (tState.forces[sector][faction] || 0) + count;
    }

    /**
     * Removes forces from a territory, greedily taking from available sectors.
     */
    static removeForce(state: GameState, territory: string, faction: string, count: number): void {
        const tState = state.boardState[territory];
        if (!tState || !tState.forces) return;

        let remaining = count;
        // Iterate sectors
        for (const sectorKey in tState.forces) {
            if (remaining <= 0) break;
            const sector = parseInt(sectorKey);
            const sForces = tState.forces[sector];
            const available = sForces[faction] || 0;

            if (available > 0) {
                const toDeduct = Math.min(available, remaining);
                sForces[faction] -= toDeduct;
                remaining -= toDeduct;

                if (sForces[faction] === 0) delete sForces[faction];
            }
        }
    }

    /**
     * Removes forces from a specific sector.
     */
    static removeForceFromSector(state: GameState, territory: string, sector: number, faction: string, count: number): void {
        const tState = state.boardState[territory];
        if (!tState || !tState.forces) return;

        const sForces = tState.forces[sector];
        if (!sForces) return;

        const available = sForces[faction] || 0;
        if (available > 0) {
            const toDeduct = Math.min(available, count);
            sForces[faction] -= toDeduct;
            if (sForces[faction] === 0) delete sForces[faction];
        }
    }

    // --- Utils / Storm ---

    /**
     * Checks if a territory is essentially blocked by storm (all sectors in storm).
     * Simplified: If ANY sector is safe, it's not fully in storm for movement purposes.
     * But usually we check specific path.
     * For placement: "Cannot ship into a sector in storm".
     */
    static isInStorm(state: GameState, territory: string): boolean {
        const tData = BOARD_MAP[territory];
        if (!tData) return false;
        // If all sectors are the storm sector
        return tData.sectors.every(s => s.sector === state.stormLocation);
    }

    static isSectorInStorm(state: GameState, sector: number): boolean {
        return state.stormLocation === sector;
    }

    // --- UI Helpers ---

    static getStrongholdNames(): string[] {
        return Object.values(BOARD_MAP).filter(t => t.isStronghold).map(t => t.name);
    }

    static getNonStrongholdNames(): string[] {
        return Object.values(BOARD_MAP).filter(t => !t.isStronghold).map(t => t.name);
    }

    static getSectors(territory: string): number[] {
        const tData = BOARD_MAP[territory];
        if (!tData) return [];
        return tData.sectors.map(s => s.sector);
    }

    static getValidDestinations(state: GameState, faction: string, fromTerritory?: string): string[] {
        // Simplified: return all names for now, or filter by adjacency if fromTerritory is provided
        if (fromTerritory) {
            const tData = BOARD_MAP[fromTerritory];
            if (!tData) return [];
            // Basic adjacency (ignoring worms/thopters for this helper for now, or implement standard dist check)
            // This is good for "Move" command dropdowns
            return tData.neighbors;
        }
        return Object.keys(BOARD_MAP);
    }
}
