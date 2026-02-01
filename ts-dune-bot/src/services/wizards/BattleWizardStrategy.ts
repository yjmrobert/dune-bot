import { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, EmbedBuilder } from "discord.js";
import { GameState, Faction } from "../../types";
import { WizardService, WizardStep } from "../WizardService";
import { IWizardStrategy } from "./IWizardStrategy";

export class BattleWizardStrategy implements IWizardStrategy {
    handleInteraction(state: GameState, playerId: string, action: string, interaction: any, args: string[]): WizardStep {
        const key = "battle";
        const wState = WizardService.getWizardState(state, playerId, key);
        if (typeof wState.troops !== 'number') wState.troops = 0;
        if (!wState.subMenu) wState.subMenu = 'none';

        const faction = state.factions.find(f => f.playerDiscordId === playerId);
        let maxTroops = 0;
        if (state.battleState) {
            const terr = state.boardState[state.battleState.territory];
            if (terr) {
                Object.values(terr.forces).forEach(sectorForces => {
                     if (sectorForces[faction?.faction || ""]) maxTroops += sectorForces[faction?.faction || ""];
                });
            }
        }

        if (action === "reset") {
            WizardService.clearWizardState(state, playerId, key);
        } else if (action === "commit_add") {
             if (wState.troops < maxTroops) {
                 wState.troops++;
                 WizardService.updateWizardState(state, playerId, key, { troops: wState.troops });
             }
        } else if (action === "commit_sub") {
             if (wState.troops > 0) {
                 wState.troops--;
                 WizardService.updateWizardState(state, playerId, key, { troops: wState.troops });
             }
        } else if (action === "menu_leader") {
             WizardService.updateWizardState(state, playerId, key, { subMenu: 'leader' });
        } else if (action === "menu_weapon") {
             WizardService.updateWizardState(state, playerId, key, { subMenu: 'weapon' });
        } else if (action === "menu_defense") {
             WizardService.updateWizardState(state, playerId, key, { subMenu: 'defense' });
        } else if (action === "menu_none") {
             WizardService.updateWizardState(state, playerId, key, { subMenu: 'none' });
        } else if (action === "select_leader") {
             const leaderName = args[0];
             WizardService.updateWizardState(state, playerId, key, { leader: leaderName, subMenu: 'none' });
        } else if (action === "select_weapon") {
             const cardName = args[0];
             WizardService.updateWizardState(state, playerId, key, { weapon: cardName, subMenu: 'none' });
        } else if (action === "select_defense") {
             const cardName = args[0];
             WizardService.updateWizardState(state, playerId, key, { defense: cardName, subMenu: 'none' });
        } 
        
        // Voice Actions
        else if (action === "voice_must") {
             WizardService.updateWizardState(state, playerId, key, { voiceAction: "MUST" });
        } else if (action === "voice_cannot") {
             WizardService.updateWizardState(state, playerId, key, { voiceAction: "CANNOT" });
        } else if (action === "voice_type_weapon") {
             WizardService.updateWizardState(state, playerId, key, { voiceType: "WEAPON" });
        } else if (action === "voice_type_defense") {
             WizardService.updateWizardState(state, playerId, key, { voiceType: "DEFENSE" });
        } else if (action === "voice_type_cheap") {
             WizardService.updateWizardState(state, playerId, key, { voiceType: "CHEAP_HERO" });
        }

        return this.getStep(state, playerId);
    }

    getStep(state: GameState, playerId: string): WizardStep {
        const faction = state.factions.find(f => f.playerDiscordId === playerId);
        if (!faction) return { content: "Error: Faction not found.", components: [] };
        if (!state.battleState) return { content: "Error: No active battle.", components: [] };

        const turn = state.turn;
        
        // Check for Voice Phase
        if (faction.faction === Faction.BeneGesserit && !state.battleState.voice) {
            // Check if BG is involved
            const isAgg = state.battleState.aggressorId === playerId;
            const isDef = state.battleState.defenderId === playerId;
            
            if (isAgg || isDef) {
                // Determine opponent
                const opponentId = isAgg ? state.battleState.defenderId : state.battleState.aggressorId;
                const opponent = state.factions.find(f => f.playerDiscordId === opponentId);
                
                const wState = WizardService.getWizardState(state, playerId, "battle");
                const vAction = wState.voiceAction || "MUST";
                const vType = wState.voiceType || "WEAPON";
                
                const embed = new EmbedBuilder()
                    .setTitle("Voice (Bene Gesserit)")
                    .setDescription(`You may voice your opponent ${opponent?.faction}.\n\nCurrent: You **${vAction}** play a **${vType}**.`);
                
                const components: ActionRowBuilder<ButtonBuilder | StringSelectMenuBuilder>[] = [];
                
                // Action Row
                components.push(new ActionRowBuilder<ButtonBuilder>().addComponents(
                    new ButtonBuilder().setCustomId(`wizard:battle:voice_must:${turn}`).setLabel("Must").setStyle(vAction === "MUST" ? ButtonStyle.Success : ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId(`wizard:battle:voice_cannot:${turn}`).setLabel("Cannot").setStyle(vAction === "CANNOT" ? ButtonStyle.Danger : ButtonStyle.Secondary)
                ));
                
                // Type Row
                components.push(new ActionRowBuilder<ButtonBuilder>().addComponents(
                    new ButtonBuilder().setCustomId(`wizard:battle:voice_type_weapon:${turn}`).setLabel("Weapon").setStyle(vType === "WEAPON" ? ButtonStyle.Primary : ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId(`wizard:battle:voice_type_defense:${turn}`).setLabel("Defense").setStyle(vType === "DEFENSE" ? ButtonStyle.Primary : ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId(`wizard:battle:voice_type_cheap:${turn}`).setLabel("Cheap Hero").setStyle(vType === "CHEAP_HERO" ? ButtonStyle.Primary : ButtonStyle.Secondary)
                ));
                
                // Confirm Voice
                components.push(new ActionRowBuilder<ButtonBuilder>().addComponents(
                    new ButtonBuilder().setCustomId(`wizard:battle:confirm_voice:${turn}`).setLabel("Use Voice").setStyle(ButtonStyle.Success)
                ));
                
                return { embed, components };
            }
        }


        const wState = WizardService.getWizardState(state, playerId, "battle");
        const troops = wState.troops || 0;
        const leader = wState.leader;
        const weapon = wState.weapon;
        const defense = wState.defense;
        const subMenu = wState.subMenu || 'none';

        const embed = new EmbedBuilder()
            .setTitle(`Battle for ${state.battleState.territory}`)
            .setColor(0xFF0000);

        const components: ActionRowBuilder<ButtonBuilder | StringSelectMenuBuilder>[] = [];

        if (subMenu === 'leader') {
             embed.setDescription("Pick a Leader or Cheap Hero.");
             
             const availableLeaders = faction.leaders.filter(l => !l.isDead);
             
             const row = new ActionRowBuilder<ButtonBuilder>();
             availableLeaders.forEach(l => {
                 row.addComponents(
                     new ButtonBuilder()
                        .setCustomId(`wizard:battle:select_leader:${l.name}`)
                        .setLabel(`${l.name} (${l.strength})`)
                        .setStyle(ButtonStyle.Primary)
                 );
             });
             
             const hasCheapHero = faction.hand.some(c => c.name === "Cheap Hero"); 
             if (hasCheapHero) {
                 row.addComponents(
                     new ButtonBuilder()
                        .setCustomId(`wizard:battle:select_leader:Cheap Hero`)
                        .setLabel(`Cheap Hero`)
                        .setStyle(ButtonStyle.Secondary)
                 );
             }
             
             components.push(row);
             components.push(new ActionRowBuilder<ButtonBuilder>().addComponents(
                 new ButtonBuilder().setCustomId(`wizard:battle:menu_none:${turn}`).setLabel("Back").setStyle(ButtonStyle.Secondary)
             ));
             
             return { embed, components };
        }
        
        if (subMenu === 'weapon') {
             embed.setDescription("Pick a Weapon.");
             const weapons = faction.hand.filter(c => c.isWeapon);
             const row = new ActionRowBuilder<ButtonBuilder>();
             if (weapons.length === 0) embed.setDescription("You have no weapons.");
             
             weapons.forEach(c => {
                 row.addComponents(
                     new ButtonBuilder()
                        .setCustomId(`wizard:battle:select_weapon:${c.name}`)
                        .setLabel(c.name)
                        .setStyle(ButtonStyle.Primary)
                 );
             });
             if (weapons.length > 0) components.push(row);
             
             components.push(new ActionRowBuilder<ButtonBuilder>().addComponents(
                 new ButtonBuilder().setCustomId(`wizard:battle:menu_none:${turn}`).setLabel("Back").setStyle(ButtonStyle.Secondary)
             ));
             return { embed, components };
        }
        
        if (subMenu === 'defense') {
             embed.setDescription("Pick a Defense.");
             const defenses = faction.hand.filter(c => c.isDefense);
             const row = new ActionRowBuilder<ButtonBuilder>();
             if (defenses.length === 0) embed.setDescription("You have no defenses.");
             
             defenses.forEach(c => {
                 row.addComponents(
                     new ButtonBuilder()
                        .setCustomId(`wizard:battle:select_defense:${c.name}`)
                        .setLabel(c.name)
                        .setStyle(ButtonStyle.Primary)
                 );
             });
             if (defenses.length > 0) components.push(row);
             
             components.push(new ActionRowBuilder<ButtonBuilder>().addComponents(
                 new ButtonBuilder().setCustomId(`wizard:battle:menu_none:${turn}`).setLabel("Back").setStyle(ButtonStyle.Secondary)
             ));
             return { embed, components };
        }

        // Main Battle Menu
        embed.setDescription(`Configuring battle plan.\nTroops: ${troops}\nLeader: ${leader || "None"}\nWeapon: ${weapon || "None"}\nDefense: ${defense || "None"}`);
        
        if (state.battleState.voice) {
            embed.addFields({ name: "Voice Active", value: `Bene Gesserit commands: You ${state.battleState.voice.action} play a ${state.battleState.voice.cardType}.` });
        } else if (state.factions.some(f => f.faction === Faction.BeneGesserit) && !state.battleState.voice) {
            // If BG is involved but hasn't voiced yet, opponent should probably wait?
            // "Bene Gesserit may voice... *before* playing battle plans."
            // So if I am NOT BG, and BG is involved, I might need to wait?
            // For MVP, enable planning, but maybe warn? Or just let validation catch it.
            // Validation handles "Must Play" logic.
        }
        
        // Troop Controls
        components.push(new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder().setCustomId(`wizard:battle:commit_add:${turn}`).setLabel("+1 Troop").setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId(`wizard:battle:commit_sub:${turn}`).setLabel("-1 Troop").setStyle(ButtonStyle.Secondary)
        ));

        // Sub Menu Buttons
        components.push(new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder().setCustomId(`wizard:battle:menu_leader:${turn}`).setLabel("Pick Leader").setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId(`wizard:battle:menu_weapon:${turn}`).setLabel("Pick Weapon").setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId(`wizard:battle:menu_defense:${turn}`).setLabel("Pick Defense").setStyle(ButtonStyle.Primary)
        ));

        // Confirm
        components.push(new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder().setCustomId(`wizard:battle:confirm:${turn}`).setLabel("Submit Plan").setStyle(ButtonStyle.Success).setDisabled(!leader),
            new ButtonBuilder().setCustomId(`wizard:battle:reset:${turn}`).setLabel("Reset").setStyle(ButtonStyle.Danger)
        ));

        return {
            embed,
            components
        };
    }
}
