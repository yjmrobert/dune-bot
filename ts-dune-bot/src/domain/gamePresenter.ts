import { GameView, GameButton } from './viewModels';
import { GameAction, GameState } from '../types';

export function renderGame(state: GameState, actions: GameAction[] = [], gameId: string | number = "0"): GameView {
    const buttons: GameButton[] = [];
    const gId = gameId.toString();

    // --- Phase Spec Implementation ---
    let title = `Round ${state.turn}`;
    let description = `It is currently ${state.phase}.`;
    let color = '#00FF00'; // Default Success Green

    // Helper for Round Title
    const roundTitle = (name: string) => `${name} | Round ${state.turn}`;

    switch (state.phase) {
        case "Lobby":
            title = roundTitle("Lobby");
            description = "Join the game or start it.\n\nWaiting for players to join...";
            if (state.factions.length > 0) {
                 description = "Join the game or start it.";
            }
            break;
        case "Setup":
        case "Setup_TraitorPick":
        case "Setup_Forces":
            title = roundTitle("Setup");
            description = "Select your traitor and place your forces.";
            if (state.phase === "Setup_TraitorPick") {
                description += "\n\nWaiting for players to select traitors...";
            } else if (state.phase === "Setup_Forces") {
                description += "\n\nWaiting for players to place forces...";
            }
            break;
        case "Storm":
            title = "Storm"; // Spec just says Storm? No, usually follows pattern.
            // Spec says: Storm (Section Header).
            // Let's assume consistent pattern: "Storm | Round X"
            title = roundTitle("Storm");
            description = "The storm moves around Arrakis.";
            break;
        case "Spice Blow":
            title = roundTitle("Spice Blow");
            description = "Reveal the spice blow.";
            if (state.spiceBlowRevealed) {
                // If we had more details in state about the card, we'd show it here.
                // For now, simple update.
                description = "Spice Blow Revealed.";
            }
            break;
        case "Nexus":
            title = roundTitle("Nexus");
            description = "Resolve the Nexus.\n\nWaiting for players to resolve the Nexus...";
            break;
        case "Choam Charity":
            title = roundTitle("CHOAM Charity");
            description = "Claim your share of the spice.";
            break;
        case "Bidding":
            title = roundTitle("Bidding");
            description = "Bid on the treachery cards.";
            if (state.auctionQueue.length > 0) {
                 description += `\nThere are ${state.auctionQueue.length} cards left to bid on.`;
            }
            break;
        case "Revival":
            title = roundTitle("Revival");
            description = "Revive your forces.";
            break;
        case "Shipment":
        case "Movement":
        case "Shipment_Movement": // Case handled if phase name varies
            title = roundTitle("Shipment & Movement");
            description = "Ship your forces and move your troops.";
            break;
        case "Battle":
            title = roundTitle("Battle");
            description = "Battle for control of the territories.";
            color = '#FF0000'; // Danger Red
            break;
        case "Spice Collection":
            title = roundTitle("Spice Collection");
            description = "Collect spice from occupied territories.";
            break;
        case "Mentat Pause":
            title = roundTitle("Mentat Pause");
            description = "Take a moment to reflect on the events of the round.";
            break;
        default:
             // Fallback
             title = `Round ${state.turn}`;
             description = `Current Phase: ${state.phase}`;
    }

    // --- Button Mapping ---
    actions.forEach(action => {
        switch (action) {
            case "NEXT_PHASE":
                buttons.push({ label: 'Next Phase', style: 'PRIMARY', command: { type: 'next-phase', target: gId } });
                break;
            case "START_GAME":
                buttons.push({ label: 'Start Game', style: 'SUCCESS', command: { type: 'start-game', target: gId } });
                break;
            case "JOIN_GAME":
                buttons.push({ label: 'Join Game', style: 'PRIMARY', command: { type: 'join-game', target: gId } });
                break;
            case "PICK_TRAITOR":
                buttons.push({ label: 'Select Traitor', style: 'SUCCESS', command: { type: 'wizard', target: 'setup_traitor', value: `open:${gId}` } });
                break;
            case "SETUP_FORCES":
                buttons.push({ label: 'Place Forces', style: 'SUCCESS', command: { type: 'wizard', target: 'setup_forces', value: `open:${gId}` } });
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
            case "BID":
                buttons.push({ label: 'Bid', style: 'SUCCESS', command: { type: 'bid', target: gId } });
                break;
            case "PASS":
                buttons.push({ label: 'Pass', style: 'SECONDARY', command: { type: 'pass', target: gId } });
                break;
            case "REVIVE":
                // Updated to match SPEC: Open Revival Menu
                buttons.push({ label: 'Open Revival Menu', style: 'SUCCESS', command: { type: 'wizard', target: 'revival', value: `open:${gId}` } });
                break;
            case "SHIP":
                // Updated to match SPEC: Shipment (Wizard)
                buttons.push({ label: 'Shipment', style: 'PRIMARY', command: { type: 'wizard', target: 'shipment', value: `open:${gId}` } });
                break;
            case "MOVE":
                // Updated to match SPEC: Movement (Wizard)
                buttons.push({ label: 'Movement', style: 'PRIMARY', command: { type: 'wizard', target: 'movement', value: `open:${gId}` } });
                break;
            case "ATTACK":
                // Updated to match SPEC: Battle for Territory (Wizard)
                // Note: Target for attack might need to be specific.
                // For now, just opening the Battle Wizard.
                buttons.push({ label: 'Battle', style: 'DANGER', command: { type: 'wizard', target: 'battle', value: `open:${gId}` } });
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
            case "COLLECT_SPICE":
                buttons.push({ label: 'Collect', style: 'SUCCESS', command: { type: 'collect-spice', target: gId } });
                break;
            case "MENTAT_PAUSE":
                buttons.push({ label: 'Back to Game', style: 'SECONDARY', command: { type: 'mentat-pause', target: gId } });
                break;
            case "PLAYER_ACTIONS":
                 // Generic Player Action button (My Info)
                buttons.push({ label: 'My Info', style: 'SECONDARY', command: { type: 'player-actions', target: gId } });
                break;
            case "TOGGLE_READY":
                 buttons.push({ label: 'Ready', style: 'SUCCESS', command: { type: 'toggle-ready', target: gId } });
                 break;
            case "PRESCIENCE":
                 buttons.push({ label: 'Prescience', style: 'PRIMARY', command: { type: 'prescience', target: gId } });
                 break;
        }
    });

    // --- Barrier & Waiting Logic ---
    if (state.pendingPlayerIds && state.pendingPlayerIds.length > 0) {
        const pendingNames = state.factions
            .filter(f => state.pendingPlayerIds?.includes(f.playerDiscordId))
            .map(f => f.faction)
            .join(", ");
        
        description += `\n\n**Waiting for**: ${pendingNames}`;
    }

    // Helper to get active player name
    let activePlayerName = "None";
    if (state.firstPlayerId) {
        const p = state.factions.find(f => f.playerDiscordId === state.firstPlayerId);
        if (p) activePlayerName = `${p.faction} (${p.playerName})`;
    }
    
    // Add Last Action Log
    const lastAction = state.actionLog.length > 0 ? state.actionLog[state.actionLog.length - 1] : "";
    if (lastAction) {
        description += `\n\n**Last Action**: ${lastAction}`;
    }

    return {
        content: `**${title}**`,
        embed: {
            title: title,
            description: description,
            color: color,
            fields: [
                { name: 'Turn', value: state.turn.toString(), inline: true },
                { name: 'Storm', value: state.stormLocation.toString(), inline: true },
                { name: 'First Player', value: activePlayerName, inline: true }
            ]
        },
        buttons: buttons
    };
}
