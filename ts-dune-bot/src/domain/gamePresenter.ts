import { GameView, GameButton } from './viewModels';
import { GameAction, GameState } from '../types';

export function renderGame(state: GameState, actions: GameAction[] = [], gameId: string | number = "0"): GameView {
    const buttons: GameButton[] = [];
    const gId = gameId.toString();

    // Map Actions to Buttons
    actions.forEach(action => {
        switch (action) {
            case "NEXT_PHASE":
                buttons.push({ label: 'Next Phase', style: 'PRIMARY', command: { type: 'next-phase', target: gId } });
                break;
            case "BID":
                buttons.push({ label: 'Bid', style: 'SUCCESS', command: { type: 'bid', target: gId } });
                break;
            case "PASS":
                buttons.push({ label: 'Pass', style: 'SECONDARY', command: { type: 'pass', target: gId } });
                break;
            case "REVIVE":
                buttons.push({ label: 'Revive Forces', style: 'SUCCESS', command: { type: 'revive', target: gId } });
                break;
            case "SHIP":
                buttons.push({ label: 'Ship Forces', style: 'PRIMARY', command: { type: 'ship', target: gId } });
                break;
            case "MOVE":
                buttons.push({ label: 'Move Forces', style: 'PRIMARY', command: { type: 'move', target: gId } });
                break;
            case "ATTACK":
                buttons.push({ label: 'Attack', style: 'DANGER', command: { type: 'attack', target: 'p2' } }); // TODO: Target selection
                break;
            case "SUBMIT_PLAN":
                buttons.push({ label: 'Submit Battle Plan', style: 'DANGER', command: { type: 'plan', target: gId } });
                break;
            case "REVEAL_PLAN":
                buttons.push({ label: 'Reveal Battle Plan', style: 'DANGER', command: { type: 'reveal-plan', target: gId } });
                break;
            case "RESOLVE_BATTLES":
                buttons.push({ label: 'Resolve Battles', style: 'DANGER', command: { type: 'resolve-battles', target: gId } });
                break;
            case "TRAITOR":
                buttons.push({ label: 'Call Traitor', style: 'DANGER', command: { type: 'traitor', target: gId } });
                break;
            case "MOVE_STORM":
                buttons.push({ label: 'Move Storm', style: 'PRIMARY', command: { type: 'move-storm', target: gId } });
                break;
            case "SPICE_BLOW":
                buttons.push({ label: 'Reveal Spice Blow', style: 'PRIMARY', command: { type: 'spice-blow', target: gId } });
                break;
            case "COLLECT_SPICE":
                buttons.push({ label: 'Collect Spice', style: 'SUCCESS', command: { type: 'collect-spice', target: gId } });
                break;
            case "MENTAT_PAUSE":
                buttons.push({ label: 'Mentat Pause', style: 'SECONDARY', command: { type: 'mentat-pause', target: gId } });
                break;
            case "PLAYER_ACTIONS":
                buttons.push({ label: 'My Actions', style: 'SECONDARY', command: { type: 'player-actions', target: gId } });
                break;
            // Additional actions can be mapped here as needed
        }
    });

    // Helper to get active player name
    let activePlayerName = "None";
    if (state.firstPlayerId) {
        const p = state.factions.find(f => f.playerDiscordId === state.firstPlayerId);
        if (p) activePlayerName = `${p.faction} (${p.playerName})`;
    }

    const isInCombat = !!state.battleState;

    const description = isInCombat
        ? `Combat is active!`
        : `It is currently ${state.phase}.`;

    return {
        content: `**Current Phase**: ${state.phase}`,
        embed: {
            title: `Game Status`,
            description: description,
            color: isInCombat ? '#FF0000' : '#00FF00',
            fields: [
                { name: 'Turn', value: state.turn.toString(), inline: true },
                { name: 'Storm', value: state.stormLocation.toString(), inline: true },
                { name: 'First Player', value: activePlayerName, inline: true }
            ]
        },
        buttons: buttons
    };
}
