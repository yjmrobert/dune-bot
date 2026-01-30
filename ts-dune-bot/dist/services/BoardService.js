"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BoardService = void 0;
const map_1 = require("../constants/map");
class BoardService {
    // --- Queries ---
    /**
     * Returns aggregated forces per faction in a territory (summed across all sectors).
     */
    static getForces(state, territory) {
        const tState = state.boardState[territory];
        if (!tState || !tState.forces)
            return {};
        const aggregated = {};
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
    static getSectorForces(state, territory, sector) {
        const tState = state.boardState[territory];
        if (!tState || !tState.forces || !tState.forces[sector])
            return {};
        return tState.forces[sector];
    }
    /**
     * Checks if a faction has any forces in the territory.
     */
    static hasForce(state, territory, faction) {
        const forces = this.getForces(state, territory);
        return (forces[faction] || 0) > 0;
    }
    /**
     * Returns the faction controlling the territory (sole occupier).
     * Returns null if contested or empty.
     */
    static getController(state, territory) {
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
    static addForce(state, territory, sector, faction, count) {
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
    static removeForce(state, territory, faction, count) {
        const tState = state.boardState[territory];
        if (!tState || !tState.forces)
            return;
        let remaining = count;
        // Iterate sectors
        for (const sectorKey in tState.forces) {
            if (remaining <= 0)
                break;
            const sector = parseInt(sectorKey);
            const sForces = tState.forces[sector];
            const available = sForces[faction] || 0;
            if (available > 0) {
                const toDeduct = Math.min(available, remaining);
                sForces[faction] -= toDeduct;
                remaining -= toDeduct;
                if (sForces[faction] === 0)
                    delete sForces[faction];
            }
        }
    }
    /**
     * Removes forces from a specific sector.
     */
    static removeForceFromSector(state, territory, sector, faction, count) {
        const tState = state.boardState[territory];
        if (!tState || !tState.forces)
            return;
        const sForces = tState.forces[sector];
        if (!sForces)
            return;
        const available = sForces[faction] || 0;
        if (available > 0) {
            const toDeduct = Math.min(available, count);
            sForces[faction] -= toDeduct;
            if (sForces[faction] === 0)
                delete sForces[faction];
        }
    }
    // --- Utils / Storm ---
    /**
     * Checks if a territory is essentially blocked by storm (all sectors in storm).
     * Simplified: If ANY sector is safe, it's not fully in storm for movement purposes.
     * But usually we check specific path.
     * For placement: "Cannot ship into a sector in storm".
     */
    static isInStorm(state, territory) {
        const tData = map_1.BOARD_MAP[territory];
        if (!tData)
            return false;
        // If all sectors are the storm sector
        return tData.sectors.every(s => s.sector === state.stormLocation);
    }
    static isSectorInStorm(state, sector) {
        return state.stormLocation === sector;
    }
    // --- UI Helpers ---
    static getStrongholdNames() {
        return Object.values(map_1.BOARD_MAP).filter(t => t.isStronghold).map(t => t.name);
    }
    static getNonStrongholdNames() {
        return Object.values(map_1.BOARD_MAP).filter(t => !t.isStronghold).map(t => t.name);
    }
    static getSectors(territory) {
        const tData = map_1.BOARD_MAP[territory];
        if (!tData)
            return [];
        return tData.sectors.map(s => s.sector);
    }
    static getValidDestinations(state, faction, fromTerritory) {
        // Simplified: return all names for now, or filter by adjacency if fromTerritory is provided
        if (fromTerritory) {
            const tData = map_1.BOARD_MAP[fromTerritory];
            if (!tData)
                return [];
            // Basic adjacency (ignoring worms/thopters for this helper for now, or implement standard dist check)
            // This is good for "Move" command dropdowns
            return tData.neighbors;
        }
        return Object.keys(map_1.BOARD_MAP);
    }
}
exports.BoardService = BoardService;
