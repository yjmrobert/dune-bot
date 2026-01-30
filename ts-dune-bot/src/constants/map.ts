export interface Coordinate {
    x: number;
    y: number;
}

export interface SectorDefinition {
    sector: number; // The Storm Sector (1-18)
    forceAnchor: Coordinate; // Where troops are rendered
    spiceCoord?: Coordinate; // Where spice is rendered (if applicable)
}

export interface TerritoryData {
    name: string;
    isStronghold: boolean;
    neighbors: string[]; 
    sectors: SectorDefinition[];
}

export const BOARD_MAP: Record<string, TerritoryData> = {
    // --- Strongholds ---
    "Arrakeen": {
        name: "Arrakeen",
        isStronghold: true,
        neighbors: ["Imperial Basin", "Old Gap", "Rim Wall West"],
        sectors: [
            { sector: 10, forceAnchor: { x: 1800, y: 600 } },
        ]
    },
    "Carthag": {
        name: "Carthag",
        isStronghold: true,
        neighbors: ["Imperial Basin", "Hagga Basin", "Tsimpo", "Arsunt"],
        sectors: [
            { sector: 11, forceAnchor: { x: 1421, y: 702 } },
        ]
    },
    "Sietch Tabr": {
        name: "Sietch Tabr",
        isStronghold: true,
        neighbors: ["Rock Outcroppings", "Plastic Basin", "Bight of the Cliff"],
        sectors: [
            { sector: 14, forceAnchor: { x: 510, y: 1000 } }
        ]
    },
    "Tuek's Sietch": {
        name: "Tuek's Sietch",
        isStronghold: true,
        neighbors: ["Pasty Mesa", "False Wall South", "South Mesa"],
        sectors: [
            { sector: 5, forceAnchor: { x: 2331120, y: 1984 } }
        ]
    },
    "Habbanya Sietch": { 
        name: "Habbanya Sietch",
        isStronghold: true,
        neighbors: ["Habbanya Ridge Flat"],
        sectors: [
            { sector: 6, forceAnchor: { x: 553, y: 2041 } }
        ]
    },

    // --- Basins / Other ---
    "Imperial Basin": {
        name: "Imperial Basin",
        isStronghold: false,
        neighbors: ["Arrakeen", "Carthag", "Shield Wall"],
        sectors: [
            { sector: 9, forceAnchor: { x: 1681, y: 1142 } },
            { sector: 10, forceAnchor: { x: 1631, y: 844 } },
            { sector: 11, forceAnchor: { x: 1487, y: 955 } }
        ]
    },
    "Hagga Basin": {
        name: "Hagga Basin",
        isStronghold: false,
        neighbors: ["Carthag", "Sietch Tabr", "Shield Wall"],
        sectors: [
            { sector: 3, forceAnchor: { x: 1098, y: 1158 } },
            { sector: 4, forceAnchor: { x: 1098, y: 1158 }, spiceCoord: { x: 1098, y: 1158 } } // Spice was here in old JSON (Sector 13? Unclear, defaulting to 4)
        ]
    },
    "Shield Wall": {
        name: "Shield Wall",
        isStronghold: false,
        neighbors: ["Imperial Basin", "Sietch Tabr", "Hagga Basin"],
        sectors: [
            { sector: 2, forceAnchor: { x: 0, y: 0 } },
            { sector: 3, forceAnchor: { x: 0, y: 0 } }
        ]
    },
    "Pasty Mesa": {
        name: "Pasty Mesa",
        isStronghold: false,
        neighbors: ["Shield Wall", "Tuek's Sietch"],
        sectors: [
            { sector: 4, forceAnchor: { x: 0, y: 0 } },
            { sector: 5, forceAnchor: { x: 0, y: 0 } }
        ]
    },
    "Habbanya Ridge": {
        name: "Habbanya Ridge",
        isStronghold: false,
        neighbors: ["Habbanya Sietch", "The Great Flat"],
        sectors: [
            { sector: 6, forceAnchor: { x: 665, y: 2411 } },
            { sector: 7, forceAnchor: { x: 665, y: 2411 } }
        ]
    },
    "The Great Flat": {
        name: "The Great Flat",
        isStronghold: false,
        neighbors: ["Habbanya Ridge"],
        sectors: [
            { sector: 8, forceAnchor: { x: 263, y: 1454 } },
            { sector: 15, forceAnchor: { x: 263, y: 1454 }, spiceCoord: { x: 263, y: 1454 } }
        ]
    },

    // --- Imported from board_layout.json ---
    "Cielago South": {
        name: "Cielago South",
        isStronghold: false,
        neighbors: [],
        sectors: [
            { sector: 2, forceAnchor: { x: 1466, y: 2673 }, spiceCoord: { x: 1466, y: 2673 } }
        ]
    },
    "Cielago North": {
        name: "Cielago North",
        isStronghold: false,
        neighbors: [],
        sectors: [
            { sector: 3, forceAnchor: { x: 1564, y: 1948 }, spiceCoord: { x: 1564, y: 1948 } }
        ]
    },
    "South Mesa": {
        name: "South Mesa",
        isStronghold: false,
        neighbors: [],
        sectors: [
            { sector: 5, forceAnchor: { x: 2493, y: 1993 }, spiceCoord: { x: 2493, y: 1993 } }
        ]
    },
    "Red Chasm": {
        name: "Red Chasm",
        isStronghold: false,
        neighbors: [],
        sectors: [
            { sector: 7, forceAnchor: { x: 2600, y: 1436 }, spiceCoord: { x: 2600, y: 1436 } }
        ]
    },
    "The Minor Erg": {
        name: "The Minor Erg",
        isStronghold: false,
        neighbors: [],
        sectors: [
            { sector: 8, forceAnchor: { x: 1833, y: 1345 }, spiceCoord: { x: 1833, y: 1345 } }
        ]
    },
    "Sihaya Ridge": {
        name: "Sihaya Ridge",
        isStronghold: false,
        neighbors: [],
        sectors: [
            { sector: 9, forceAnchor: { x: 2243, y: 703 }, spiceCoord: { x: 2243, y: 703 } }
        ]
    },
    "Old Gap": {
        name: "Old Gap",
        isStronghold: false,
        neighbors: ["Arrakeen"],
        sectors: [
            { sector: 10, forceAnchor: { x: 1697, y: 430 }, spiceCoord: { x: 1697, y: 430 } }
        ]
    },
    "Broken Land": {
        name: "Broken Land",
        isStronghold: false,
        neighbors: ["Arrakeen", "Carthag"], 
        sectors: [
            { sector: 12, forceAnchor: { x: 1000, y: 500 }, spiceCoord: { x: 1000, y: 500 } }
        ]
    },
    "Rock OutCroppings": {
        name: "Rock OutCroppings",
        isStronghold: false,
        neighbors: [],
        sectors: [
            { sector: 14, forceAnchor: { x: 481, y: 878 }, spiceCoord: { x: 481, y: 878 } }
        ]
    },
    "Funeral Plain": {
        name: "Funeral Plain",
        isStronghold: false,
        neighbors: [],
        sectors: [
            { sector: 15, forceAnchor: { x: 287, y: 1320 }, spiceCoord: { x: 287, y: 1320 } }
        ]
    },
    "Habbanya Erg": {
        name: "Habbanya Erg",
        isStronghold: false,
        neighbors: [],
        sectors: [
            { sector: 16, forceAnchor: { x: 295, y: 1832 }, spiceCoord: { x: 295, y: 1832 } }
        ]
    },
    "Wind Pass North": {
        name: "Wind Pass North",
        isStronghold: false,
        neighbors: [],
        sectors: [
            { sector: 17, forceAnchor: { x: 1182, y: 1691 }, spiceCoord: { x: 1182, y: 1691 } }
        ]
    }
};

export const STRONGHOLDS = Object.values(BOARD_MAP).filter(t => t.isStronghold).map(t => t.name); // No change needed here if we only look at name/isStronghold
