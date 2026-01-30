import { GameState, FactionState } from "../types";
import { BOARD_MAP } from "../constants/map";


export class ShipmentMovementEngine {
    shipForces(state: GameState, factionId: string, territoryName: string, sector: number, count: number): string {
        const faction = state.factions.find(f => f.playerDiscordId === factionId);
        if (!faction) throw new Error("Player not found.");

        if (count <= 0) throw new Error("Must ship at least 1 force.");
        if (faction.reserves < count) throw new Error(`Not enough forces in reserves. You have ${faction.reserves}.`);

        // Check Storm
        if (state.stormLocation === sector) throw new Error("Cannot ship into a sector in storm.");

        // Check Mapping (Simplified: Assume territoryName is valid key)
        const territoryData = BOARD_MAP[territoryName];
        if (!territoryData) throw new Error("Invalid territory.");

        // Validate Sector is part of Territory
        if (!territoryData.sectors.includes(sector)) throw new Error(`Territory ${territoryName} does not exist in sector ${sector}.`);

        // Cost Calculation
        // Stronghold = 1, Other = 2
        // Guild has half price? (Not implementing special powers yet, stick to rules first)
        const costPerForce = territoryData.isStronghold ? 1 : 2;
        const totalCost = count * costPerForce;

        if (faction.spice < totalCost) throw new Error(`Not enough spice. Cost is ${totalCost}.`);

        // Execute
        faction.spice -= totalCost;
        faction.reserves -= count;

        if (!state.boardState[territoryName]) {
            state.boardState[territoryName] = { name: territoryName, spice: 0, forces: {} };
        }

        const currentForces = state.boardState[territoryName].forces[faction.faction] || 0;
        state.boardState[territoryName].forces[faction.faction] = currentForces + count;

        const msg = `${faction.playerName} shipped ${count} forces to ${territoryName} (Sector ${sector}) for ${totalCost} spice.`;
        state.actionLog.push(msg);
        return msg;
    }

    moveForces(state: GameState, factionId: string, fromTerritory: string, toTerritory: string, count: number): string {
        const faction = state.factions.find(f => f.playerDiscordId === factionId);
        if (!faction) throw new Error("Player not found.");

        if (count <= 0) throw new Error("Must move at least 1 force.");

        // Check Source
        const source = state.boardState[fromTerritory];
        if (!source || (source.forces[faction.faction] || 0) < count) {
            throw new Error("Not enough forces in source territory.");
        }

        // Validate Map
        const fromData = BOARD_MAP[fromTerritory];
        const toData = BOARD_MAP[toTerritory];
        if (!fromData || !toData) throw new Error("Invalid territory names.");

        // Check Adjacency / Pathfinding
        // Base move = 1 adjacent
        // Ornithopters = 3 range IF have forces in Arrakeen or Carthag

        const hasOrnithopters = this.checkOrnithopters(state, faction.faction); // Using faction enum/string
        const maxRange = hasOrnithopters ? 3 : 1;

        const distance = this.getDistance(fromTerritory, toTerritory);

        if (distance === -1 || distance > maxRange) {
            throw new Error(`Target is too far. Max range: ${maxRange}.`);
        }

        // Note: Real pathfinding needs to check Storm blocking path.
        // For MVP, we assume BFS on neighbor graph ignoring sectors for adjacency, 
        // BUT strict rule says "passed through part covered by storm".
        // We will just simplify: If any sector of target or source is in storm? 
        // Or if the specific path chosen crosses storm.
        // Let's implement pathfinding that avoids storm.

        if (!this.canReach(state.stormLocation, fromTerritory, toTerritory, maxRange)) {
            throw new Error("Movement blocked by storm or range.");
        }

        // Execute
        source.forces[faction.faction] -= count;
        if (source.forces[faction.faction] === 0) delete source.forces[faction.faction]; // Cleanup

        if (!state.boardState[toTerritory]) {
            state.boardState[toTerritory] = { name: toTerritory, spice: 0, forces: {} };
        }
        const target = state.boardState[toTerritory];
        target.forces[faction.faction] = (target.forces[faction.faction] || 0) + count;

        const msg = `${faction.playerName} moved ${count} forces from ${fromTerritory} to ${toTerritory}.`;
        state.actionLog.push(msg);
        return msg;
    }

    private checkOrnithopters(state: GameState, faction: string): boolean {
        // Person controls Arrakeen or Carthag
        const controls = (tName: string) => {
            const t = state.boardState[tName];
            if (!t) return false;
            // Check existence of forces. (Control logic usually means "only one there" or "flag", but here just "has forces" per rule snippet?)
            // Rule snippet: "A player who starts a force move with one or more forces in either Arrakeen..."
            return (t.forces[faction] || 0) > 0;
        };
        return controls("Arrakeen") || controls("Carthag");
    }

    // BFS for distance
    private getDistance(start: string, end: string): number {
        if (start === end) return 0;
        const queue: { name: string, dist: number }[] = [{ name: start, dist: 0 }];
        const visited = new Set<string>();
        visited.add(start);

        while (queue.length > 0) {
            const { name, dist } = queue.shift()!;
            if (name === end) return dist;

            const neighbors = BOARD_MAP[name]?.neighbors || [];
            for (const n of neighbors) {
                if (!visited.has(n)) {
                    visited.add(n);
                    queue.push({ name: n, dist: dist + 1 });
                }
            }
        }
        return -1;
    }

    // BFS with Storm check
    private canReach(stormSector: number, start: string, end: string, maxDist: number): boolean {
        const queue: { name: string, dist: number }[] = [{ name: start, dist: 0 }];
        const visited = new Set<string>();
        visited.add(start);

        // Helper: isBlocked
        // A territory is blocked if ALL its sectors are in storm? 
        // Or if we pass through it?
        // Rule: "Force may not move into, out of, or through a sector in storm."
        // If a territory has multiple sectors, and one is NOT in storm, we can pass through?
        // Yes: "move into and out of a territory ... so long as the group does not pass through the part covered by the storm."
        // Simplified: If a territory has ANY sector NOT in storm, it is passable/enterable.
        // If ALL sectors are in storm, it is blocked.

        const isBlocked = (tName: string) => {
            const sectors = BOARD_MAP[tName]?.sectors || [];
            // If any sector != stormSector, valid. 
            // If all sectors == stormSector (unlikely unless single sector), blocked.
            if (sectors.length === 0) return false;
            return sectors.every(s => s === stormSector);
        };

        if (isBlocked(start)) return false; // Can't move out

        while (queue.length > 0) {
            const { name, dist } = queue.shift()!;
            if (name === end) return dist <= maxDist;

            if (dist >= maxDist) continue;

            const neighbors = BOARD_MAP[name]?.neighbors || [];
            for (const n of neighbors) {
                if (!visited.has(n)) {
                    if (!isBlocked(n)) {
                        visited.add(n);
                        queue.push({ name: n, dist: dist + 1 });
                    }
                }
            }
        }
        return false;
    }
}
