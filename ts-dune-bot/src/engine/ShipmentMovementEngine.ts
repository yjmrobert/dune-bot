import { GameState, FactionState, Faction } from "../types";
import { BOARD_MAP } from "../constants/map";
import { BoardService } from "../services/BoardService";


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
        if (!territoryData.sectors.some(s => s.sector === sector)) throw new Error(`Territory ${territoryName} does not exist in sector ${sector}.`);

        // Cost Calculation
        // Stronghold = 1, Other = 2
        let costPerForce = territoryData.isStronghold ? 1 : 2;

        // Faction Abilities
        if (faction.faction === Faction.Guild) {
            // Guild pays half? (Round up or down? "Pay half" usually implies ceil cost or strict 50%)
            // Rules say "Guild pays half spice for shipment."
            // Let's implement generic 50% off total.
        }
        
        // Fremen Shipment Rule: Ship to Great Flat or adjacent for FREE?
        // Rules: "Fremen forces... can be shipped to the Great Flat or any territory within 2 territories of the Great Flat... for free."
        // Actually usually "reserves are on Arrakis" so they don't ship from space.
        // But for MVP, if "shipping" action is used:
        let isFremenFreeShipment = false;
        if (faction.faction === Faction.Fremen) {
             // Check distance to Great Flat
             // For now, simpler rule: Ship to Great Flat is free.
             if (territoryName === "Great Flat") isFremenFreeShipment = true;
             // Check adjacent?
             // TODO: Real distance check. For MVP, just Great Flat is 0.
        }

        if (isFremenFreeShipment) {
            costPerForce = 0;
        }

        let totalCost = count * costPerForce;

        if (faction.faction === Faction.Guild && totalCost > 0) {
            totalCost = Math.ceil(totalCost / 2);
        }

        if (faction.spice < totalCost) throw new Error(`Not enough spice. Cost is ${totalCost}.`);

        // Execute
        faction.spice -= totalCost;
        faction.reserves -= count;

        BoardService.addForce(state, territoryName, sector, faction.faction, count);

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
        let availableInSource = 0;
        if (source) {
            Object.values(source.forces).forEach(sf => {
                availableInSource += (sf[faction.faction] || 0);
            });
        }

        if (!source || availableInSource < count) {
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
        let maxRange = hasOrnithopters ? 3 : 1;
        
        // Fremen Ability: "Move 2 territories"
        if (faction.faction === Faction.Fremen) {
            maxRange = Math.max(maxRange, 2);
            // If they have Ornis, do they get 3? Yes (3 > 2).
            // So default 2, or 3 with Ornis.
        }

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

        if (!this.canReach(state, fromTerritory, toTerritory, maxRange)) {
            throw new Error("Movement blocked by storm or range.");
        }

        // Execute
        // Execute
        let remaining = count;
        if (source) {
            // Greedy removal
            for (const sKey in source.forces) {
                if (remaining <= 0) break;
                const sForces = source.forces[parseInt(sKey)];
                const sCount = sForces[faction.faction] || 0;
                if (sCount > 0) {
                    const deduct = Math.min(sCount, remaining);
                    sForces[faction.faction] -= deduct;
                    remaining -= deduct;
                    if (sForces[faction.faction] === 0) delete sForces[faction.faction];
                }
            }
        }

        if (!state.boardState[toTerritory]) {
            state.boardState[toTerritory] = { name: toTerritory, spice: 0, forces: {} };
        }
        const target = state.boardState[toTerritory];
        // Default sector: first one defined in map
        const targetSector = toData.sectors[0].sector;

        if (!target.forces[targetSector]) target.forces[targetSector] = {};
        target.forces[targetSector][faction.faction] = (target.forces[targetSector][faction.faction] || 0) + count;

        const msg = `${faction.playerName} moved ${count} forces from ${fromTerritory} to ${toTerritory}.`;
        state.actionLog.push(msg);
        return msg;
    }

    private checkOrnithopters(state: GameState, faction: string): boolean {
        // Person controls Arrakeen or Carthag
        return BoardService.hasForce(state, "Arrakeen", faction) || BoardService.hasForce(state, "Carthag", faction);
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
    private canReach(state: GameState, start: string, end: string, maxDist: number): boolean {
        const queue: { name: string, dist: number }[] = [{ name: start, dist: 0 }];
        const visited = new Set<string>();
        visited.add(start);

        const isBlocked = (tName: string) => BoardService.isInStorm(state, tName);

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
