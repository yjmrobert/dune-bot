import { GameView, GameButton } from './viewModels';
import { GameAction } from '../types';

// Mock GameState as requested
export interface GameState {
    phase: string;
    activePlayer: string;
    spice: number;
    isInCombat: boolean;
    validActions?: string[]; // Kept for compat, but we use 'actions' arg now
}

export function renderGame(state: GameState, actions: GameAction[] = []): GameView {
    const buttons: GameButton[] = [];

    // Map Actions to Buttons
    actions.forEach(action => {
        switch (action) {
            case "NEXT_PHASE":
                buttons.push({ label: 'Next Phase', style: 'PRIMARY', command: { type: 'next-phase', target: 'game-id' } });
                break;
            case "BID":
                buttons.push({ label: 'Bid', style: 'SUCCESS', command: { type: 'bid', target: 'game-id' } });
                break;
            case "PASS":
                buttons.push({ label: 'Pass', style: 'SECONDARY', command: { type: 'pass', target: 'game-id' } });
                break;
            case "ATTACK":
                buttons.push({ label: 'Attack', style: 'DANGER', command: { type: 'attack', target: 'p2' } });
                break;
            case "REVIVE":
                buttons.push({ label: 'Revive Forces', style: 'SUCCESS', command: { type: 'revive', target: 'game-id' } });
                break;
            case "SHIP":
                buttons.push({ label: 'Ship Forces', style: 'PRIMARY', command: { type: 'ship', target: 'game-id' } });
                break;
            case "MOVE":
                buttons.push({ label: 'Move Forces', style: 'PRIMARY', command: { type: 'move', target: 'game-id' } });
                break;
            case "SUBMIT_PLAN":
                buttons.push({ label: 'Submit Battle Plan', style: 'DANGER', command: { type: 'plan', target: 'game-id' } });
                break;
            case "TRAITOR":
                buttons.push({ label: 'Call Traitor', style: 'DANGER', command: { type: 'traitor', target: 'game-id' } });
                break;
            case "RESOLVE_BATTLES":
                buttons.push({ label: 'Resolve Battles', style: 'DANGER', command: { type: 'resolve-battles', target: 'game-id' } });
                break;
        }
    });

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
