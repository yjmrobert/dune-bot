"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderGame = renderGame;
function renderGame(state) {
    const buttons = [];
    // Add action buttons based on state
    if (state.validActions.includes('ATTACK')) {
        buttons.push({
            label: 'Attack',
            style: 'DANGER',
            command: {
                type: 'ATTACK',
                target: 'p2' // Mock target
            }
        });
    }
    if (state.validActions.includes('PASS')) {
        buttons.push({
            label: 'Pass',
            style: 'SECONDARY',
            command: {
                type: 'PASS'
            }
        });
    }
    // Example of dynamic content
    const description = state.isInCombat
        ? `Combat is active! ${state.activePlayer} needs to decide.`
        : `It is currently ${state.phase}. Waiting for ${state.activePlayer}.`;
    return {
        content: `**Current Phase**: ${state.phase}`,
        embed: {
            title: `Game Status: ${state.activePlayer}`,
            description: description,
            color: state.isInCombat ? '#FF0000' : '#00FF00',
            fields: [
                { name: 'Spice', value: state.spice.toString(), inline: true },
                { name: 'Combat', value: state.isInCombat ? 'Yes' : 'No', inline: true }
            ]
        },
        buttons: buttons
    };
}
