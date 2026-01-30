"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FACTION_LEADERS = void 0;
const types_1 = require("../types");
exports.FACTION_LEADERS = {
    [types_1.Faction.Atreides]: [
        { name: "Paul Atreides", strength: 10 }, // Specially handled rules usually, but for now 10
        { name: "Lady Jessica", strength: 5 },
        { name: "Thufir Hawat", strength: 5 },
        { name: "Gurney Halleck", strength: 6 },
        { name: "Duncan Idaho", strength: 2 }
    ],
    [types_1.Faction.Harkonnen]: [
        { name: "Feyd-Rautha", strength: 6 },
        { name: "Beast Rabban", strength: 4 },
        { name: "Piter de Vries", strength: 3 },
        { name: "Captain Iakin Nefud", strength: 2 },
        { name: "Umman Kudu", strength: 1 }
    ],
    [types_1.Faction.Fremen]: [
        { name: "Stilgar", strength: 7 },
        { name: "Chani", strength: 6 },
        { name: "Otheym", strength: 5 },
        { name: "Shadout Mapes", strength: 3 },
        { name: "Jamis", strength: 2 }
    ],
    [types_1.Faction.Emperor]: [
        { name: "Count Hasimir Fenring", strength: 6 },
        { name: "Captain Aramsham", strength: 5 },
        { name: "Caid", strength: 3 },
        { name: "Burseg", strength: 3 },
        { name: "Bashar", strength: 2 }
    ],
    [types_1.Faction.Guild]: [
        { name: "Staban Tuek", strength: 5 },
        { name: "Edric", strength: 5 },
        { name: "Esmar Tuek", strength: 3 },
        { name: "Master Bewt", strength: 3 },
        { name: "Soo-Soo Sook", strength: 2 }
    ],
    [types_1.Faction.BeneGesserit]: [
        { name: "Alia", strength: 5 },
        { name: "Margot Lady Fenring", strength: 5 },
        { name: "Princess Irulan", strength: 5 },
        { name: "Mother Ramallo", strength: 5 },
        { name: "Wanna Marcus", strength: 5 } // Strength varies in some versions
    ],
    [types_1.Faction.None]: []
};
