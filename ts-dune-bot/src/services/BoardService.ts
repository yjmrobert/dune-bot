import { GameState } from "../types";

export class BoardService {
    
    static addForce(state: GameState, territory: string, sector: number, faction: string, amount: number) {
        if (!state.boardState[territory]) {
            state.boardState[territory] = {
                name: territory,
                spice: 0,
                forces: {}
            };
        }
        
        const terr = state.boardState[territory];
        if (!terr.forces[sector]) {
            terr.forces[sector] = {};
        }

        if (!terr.forces[sector][faction]) {
            terr.forces[sector][faction] = 0;
        }

        terr.forces[sector][faction] += amount;
    }

    static getForces(state: GameState, territory: string): Record<string, number> {
        if (!state.boardState || !state.boardState[territory]) return {};
        
        const forces: Record<string, number> = {};
        const terr = state.boardState[territory];
        
        Object.values(terr.forces).forEach(sectorForces => {
             for (const [faction, count] of Object.entries(sectorForces)) {
                 forces[faction] = (forces[faction] || 0) + count;
             }
        });
        
        return forces;
    }
    /**
     * Returns the canonical sector ID for a given territory when shipping or placing forces.
     * Use when precise sector isn't specified by the player.
     */
    static getCanonicalSector(territory: string): number {
        // Known Strongholds and locations
        if (territory === "Arrakeen") return 10;
        if (territory === "Carthag") return 11;
        if (territory === "Sietch Tabr") return 14;
        if (territory === "Tuek's Sietch") return 5;
        if (territory === "Polar Sink") return 0;
        
        // Approximations for commonly used territories
        if (territory.includes("False Wall East")) return 14; // Near Tabr
        if (territory.includes("False Wall South")) return 12; // Fremen start
        if (territory.includes("False Wall West")) return 16; // Fremen start
        
        // Default sector 1 for generic territories if map data is missing
        // In a real implementation, this would query a complete Board/Graph definition.
        return 1;
    }

    static hasForce(state: GameState, territory: string, faction: string): boolean {
        const forces = this.getForces(state, territory);
        return (forces[faction] || 0) > 0;
    }

    static isInStorm(state: GameState, territory: string): boolean {
        // Simple check: Is the canonical sector under the storm?
        const sector = this.getCanonicalSector(territory);
        return state.stormLocation === sector;
    }

    static removeForce(state: GameState, territory: string, faction: string, amount: number) {
        if (!state.boardState || !state.boardState[territory]) return;
        const terr = state.boardState[territory];
        
        let remaining = amount;
        for (const sector in terr.forces) {
            if (terr.forces[sector][faction] > 0) {
                const available = terr.forces[sector][faction];
                const take = Math.min(available, remaining);
                terr.forces[sector][faction] -= take;
                remaining -= take;
                if (terr.forces[sector][faction] === 0) {
                    delete terr.forces[sector][faction];
                }
                if (remaining <= 0) break;
            }
        }
    }

    static getSectorForces(state: GameState, territory: string, sector: number): Record<string, number> {
        if (!state.boardState || !state.boardState[territory]) return {};
        const terr = state.boardState[territory];
        return terr.forces[sector] || {};
    }

    static removeForceFromSector(state: GameState, territory: string, sector: number, faction: string, amount: number) {
        if (!state.boardState || !state.boardState[territory]) return;
        const terr = state.boardState[territory];
        if (!terr.forces[sector] || !terr.forces[sector][faction]) return;
        
        terr.forces[sector][faction] -= amount;
        if (terr.forces[sector][faction] <= 0) {
            delete terr.forces[sector][faction];
        }
    }

    static getController(state: GameState, territory: string): string | null {
        const forces = this.getForces(state, territory);
        const factionsPresent = Object.keys(forces).filter(f => forces[f] > 0);
        
        if (factionsPresent.length === 1) return factionsPresent[0];
        return null;
    }
}
