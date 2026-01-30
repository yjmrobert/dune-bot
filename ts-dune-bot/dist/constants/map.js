"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.STRONGHOLDS = exports.BOARD_MAP = void 0;
const map_locations_json_1 = __importDefault(require("./map_locations.json"));
const LOCATIONS = map_locations_json_1.default;
function getSectors(name) {
    const data = LOCATIONS[name];
    if (!data) {
        console.warn(`No location data for ${name}`);
        return [];
    }
    return Object.keys(data).map(k => {
        const sector = parseInt(k);
        return {
            sector,
            forceAnchor: data[k].force,
            spiceCoord: data[k].spice
        };
    }).sort((a, b) => a.sector - b.sector);
}
exports.BOARD_MAP = {
    // --- Strongholds ---
    "Arrakeen": {
        name: "Arrakeen",
        isStronghold: true,
        neighbors: ["Imperial Basin", "Old Gap", "Rim Wall West"],
        sectors: getSectors("Arrakeen")
    },
    "Carthag": {
        name: "Carthag",
        isStronghold: true,
        neighbors: ["Imperial Basin", "Hagga Basin", "Tsimpo", "Arsunt"],
        sectors: getSectors("Carthag")
    },
    "Sietch Tabr": {
        name: "Sietch Tabr",
        isStronghold: true,
        neighbors: ["Rock Outcroppings", "Plastic Basin", "Bight Of The Cliff"],
        sectors: getSectors("Sietch Tabr")
    },
    "Tuek's Sietch": {
        name: "Tuek's Sietch",
        isStronghold: true,
        neighbors: ["Pasty Mesa", "False Wall South", "South Mesa"],
        sectors: getSectors("Tuek's Sietch")
    },
    "Habbanya Sietch": {
        name: "Habbanya Sietch",
        isStronghold: true,
        neighbors: ["Habbanya Ridge"],
        sectors: getSectors("Habbanya Sietch")
    },
    // --- Basins / Other ---
    "Imperial Basin": {
        name: "Imperial Basin",
        isStronghold: false,
        neighbors: ["Arrakeen", "Carthag", "Shield Wall"],
        sectors: getSectors("Imperial Basin")
    },
    "Hagga Basin": {
        name: "Hagga Basin",
        isStronghold: false,
        neighbors: ["Carthag", "Sietch Tabr", "Shield Wall"],
        sectors: getSectors("Hagga Basin")
    },
    "Shield Wall": {
        name: "Shield Wall",
        isStronghold: false,
        neighbors: ["Imperial Basin", "Sietch Tabr", "Hagga Basin"],
        sectors: getSectors("Shield Wall")
    },
    "Pasty Mesa": {
        name: "Pasty Mesa",
        isStronghold: false,
        neighbors: ["Shield Wall", "Tuek's Sietch"],
        sectors: getSectors("Pasty Mesa")
    },
    "Habbanya Ridge": {
        name: "Habbanya Ridge",
        isStronghold: false,
        neighbors: ["Habbanya Sietch", "The Great Flat"],
        sectors: getSectors("Habbanya Ridge Flat")
    },
    "The Great Flat": {
        name: "The Great Flat",
        isStronghold: false,
        neighbors: ["Habbanya Ridge"],
        sectors: getSectors("The Great Flat")
    },
    // --- Imported from board_layout.json ---
    "Cielago South": {
        name: "Cielago South",
        isStronghold: false,
        neighbors: [],
        sectors: getSectors("Cielago South")
    },
    "Cielago North": {
        name: "Cielago North",
        isStronghold: false,
        neighbors: [],
        sectors: getSectors("Cielago North")
    },
    "South Mesa": {
        name: "South Mesa",
        isStronghold: false,
        neighbors: [],
        sectors: getSectors("South Mesa")
    },
    "Red Chasm": {
        name: "Red Chasm",
        isStronghold: false,
        neighbors: [],
        sectors: getSectors("Red Chasm")
    },
    "The Minor Erg": {
        name: "The Minor Erg",
        isStronghold: false,
        neighbors: [],
        sectors: getSectors("The Minor Erg")
    },
    "Sihaya Ridge": {
        name: "Sihaya Ridge",
        isStronghold: false,
        neighbors: [],
        sectors: getSectors("Sihaya Ridge")
    },
    "Old Gap": {
        name: "Old Gap",
        isStronghold: false,
        neighbors: ["Arrakeen"],
        sectors: getSectors("Old Gap")
    },
    "Broken Land": {
        name: "Broken Land",
        isStronghold: false,
        neighbors: ["Arrakeen", "Carthag"],
        sectors: getSectors("Broken Land")
    },
    "Rock Outcroppings": {
        name: "Rock Outcroppings",
        isStronghold: false,
        neighbors: [],
        sectors: getSectors("Rock Outcroppings")
    },
    "Funeral Plain": {
        name: "Funeral Plain",
        isStronghold: false,
        neighbors: [],
        sectors: getSectors("Funeral Plain")
    },
    "Habbanya Erg": {
        name: "Habbanya Erg",
        isStronghold: false,
        neighbors: [],
        sectors: getSectors("Habbanya Erg")
    },
    "Wind Pass North": {
        name: "Wind Pass North",
        isStronghold: false,
        neighbors: [],
        sectors: getSectors("Wind Pass North")
    }
};
exports.STRONGHOLDS = Object.values(exports.BOARD_MAP).filter(t => t.isStronghold).map(t => t.name); // No change needed here if we only look at name/isStronghold
