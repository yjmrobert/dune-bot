export interface TerritoryData {
    name: string;
    isStronghold: boolean;
    sectors: number[]; // Sectors this territory occupies (for storm interaction)
    neighbors: string[]; // Names of adjacent territories
}

// Simplified Map for Logic Validation
export const BOARD_MAP: Record<string, TerritoryData> = {
    "Arrakeen": {
        name: "Arrakeen",
        isStronghold: true,
        sectors: [1, 2], // Arbitrary sectors for testing
        neighbors: ["Imperial Basin", "Old Gap", "Broken Land"]
    },
    "Carthag": {
        name: "Carthag",
        isStronghold: true,
        sectors: [2, 3],
        neighbors: ["Imperial Basin", "Hagga Basin", "Broken Land"]
    },
    "Sietch Tabr": {
        name: "Sietch Tabr",
        isStronghold: true,
        sectors: [4],
        neighbors: ["Hagga Basin", "Shield Wall"]
    },
    "Tuek's Sietch": {
        name: "Tuek's Sietch",
        isStronghold: true,
        sectors: [5],
        neighbors: ["Pasty Mesa", "False Wall South"]
    },
    "Habbanya Sietch": { // Habbanya Ridge Sietch
        name: "Habbanya Sietch",
        isStronghold: true,
        sectors: [6],
        neighbors: ["Habbanya Ridge"]
    },
    "Imperial Basin": {
        name: "Imperial Basin",
        isStronghold: false,
        sectors: [1, 2, 3],
        neighbors: ["Arrakeen", "Carthag", "Shield Wall"]
    },
    "Hagga Basin": {
        name: "Hagga Basin",
        isStronghold: false,
        sectors: [3, 4],
        neighbors: ["Carthag", "Sietch Tabr", "Shield Wall"]
    },
    "Shield Wall": {
        name: "Shield Wall",
        isStronghold: false,
        sectors: [2, 3], // Simplified
        neighbors: ["Imperial Basin", "Sietch Tabr", "Hagga Basin"]
    },
    "Pasty Mesa": {
        name: "Pasty Mesa",
        isStronghold: false,
        sectors: [4, 5],
        neighbors: ["Shield Wall", "Tuek's Sietch"]
    },
    "Habbanya Ridge": {
        name: "Habbanya Ridge",
        isStronghold: false,
        sectors: [6, 7],
        neighbors: ["Habbanya Sietch", "The Great Flat"]
    },
    "The Great Flat": {
        name: "The Great Flat",
        isStronghold: false,
        sectors: [8],
        neighbors: ["Habbanya Ridge"]
    }
};

export const STRONGHOLDS = Object.values(BOARD_MAP).filter(t => t.isStronghold).map(t => t.name);
