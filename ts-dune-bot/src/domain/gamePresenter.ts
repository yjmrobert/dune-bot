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
                buttons.push({
                    label: 'Move Storm',
                    style: 'PRIMARY',
                    command: { type: 'move-storm', target: gId },
                    disabled: state.stormMovedThisTurn || false
                });
                break;
            case "SPICE_BLOW":
                buttons.push({
                    label: 'Reveal Spice Blow',
                    style: 'PRIMARY',
                    command: { type: 'spice-blow', target: gId },
                    disabled: state.spiceBlowRevealed || false
                });
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
            case "PICK_TRAITOR":
                buttons.push({ label: 'Select Traitor', style: 'SUCCESS', command: { type: 'pick-traitor', target: gId } });
                break;
            // Additional actions can be mapped here as needed
        }
    });

    // Barrier Pattern: Show waiting list
    if (state.pendingPlayerIds && state.pendingPlayerIds.length > 0) {
        const pendingNames = state.factions
            .filter(f => state.pendingPlayerIds?.includes(f.playerDiscordId))
            .map(f => f.faction)
            .join(", ");
        
        // Append to content or description? Description is better for visibility.
        // But renderGame description is currently: "Combat is active" or "It is currently Phase".
        // Let's append to that.
    }

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

    let finalDescription = description;
    if (state.pendingPlayerIds && state.pendingPlayerIds.length > 0) {
        const pendingNames = state.factions
            .filter(f => state.pendingPlayerIds?.includes(f.playerDiscordId))
            .map(f => f.faction)
            .join(", ");
        finalDescription += `\n\n**Waiting for**: ${pendingNames}`;
    }

    const lastAction = state.actionLog.length > 0 ? state.actionLog[state.actionLog.length - 1] : "";
    const content = `**Current Phase**: ${state.phase}${lastAction ? `\n**Last Action**: ${lastAction}` : ""}`;

    return {
        content: content,
        embed: {
            title: `Game Status`,
            description: finalDescription,
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
