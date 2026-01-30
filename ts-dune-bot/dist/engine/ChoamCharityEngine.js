"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChoamCharityEngine = void 0;
class ChoamCharityEngine {
    /**
     * Checks all factions. If a faction has 0 or 1 spice, they receive spice to bring them to 2.
     * Returns a list of messages describing what happened.
     */
    processCharity(state) {
        const messages = [];
        for (const faction of state.factions) {
            if (faction.spice < 2) {
                const amountNeeded = 2 - faction.spice;
                faction.spice += amountNeeded;
                messages.push(`${faction.faction} received ${amountNeeded} spice from CHOAM Charity.`);
            }
        }
        if (messages.length === 0) {
            messages.push("No factions required CHOAM Charity.");
        }
        return messages;
    }
}
exports.ChoamCharityEngine = ChoamCharityEngine;
