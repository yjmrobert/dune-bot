import { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, EmbedBuilder } from "discord.js";
import { GameState } from "../../types";
import { WizardService, WizardStep } from "../WizardService";
import { IWizardStrategy } from "./IWizardStrategy";

export class RevivalWizardStrategy implements IWizardStrategy {
    handleInteraction(state: GameState, playerId: string, action: string, interaction: any, args: string[]): WizardStep {
        const key = "revival";
        const wState = WizardService.getWizardState(state, playerId, key);
        if (typeof wState.forces !== 'number') wState.forces = 0;
        if (!wState.leader) wState.leader = null;

        const faction = state.factions.find(f => f.playerDiscordId === playerId);
        const forcesInTanks = faction ? faction.forcesInTanks : 0;
        
        if (action === "reset") {
            WizardService.clearWizardState(state, playerId, key);
        } else if (action === "add_troop") {
             if (wState.forces < 3 && wState.forces < forcesInTanks) {
                 wState.forces++;
                 WizardService.updateWizardState(state, playerId, key, { forces: wState.forces });
             }
        } else if (action === "sub_troop") {
             if (wState.forces > 0) {
                 wState.forces--;
                 WizardService.updateWizardState(state, playerId, key, { forces: wState.forces });
             }
        } else if (action === "select_leader" && args[0]) {
             if (wState.leader === args[0]) {
                 wState.leader = null;
             } else {
                 wState.leader = args[0];
             }
             WizardService.updateWizardState(state, playerId, key, { leader: wState.leader });
        }

        return this.getStep(state, playerId);
    }

    getStep(state: GameState, playerId: string): WizardStep {
        const faction = state.factions.find(f => f.playerDiscordId === playerId);
        if (!faction) return { content: "Error: Faction not found.", components: [] };

        const wState = WizardService.getWizardState(state, playerId, "revival");
        const selectedForces = wState.forces || 0;
        const selectedLeaderName = wState.leader;

        let spiceCost = selectedForces * 2;
        
        let leaderStr = 0;
        if (selectedLeaderName) {
            const leader = faction.leaders.find(l => l.name === selectedLeaderName);
            if (leader) leaderStr = leader.strength;
            spiceCost += leaderStr;
        }

        const embed = new EmbedBuilder()
            .setTitle(`Revival Planning for ${faction.faction}`)
            .setDescription(
                `Select your troops and leaders to revive.\n` +
                `You have **${faction.forcesInTanks}** Troops in Tanks.\n` +
                `You are currently planning to revive **${selectedForces}** Troops and **${selectedLeaderName || "No Leader"}** for **${spiceCost}** Spice.`
            )
            .setColor(0x00FF00);

        const components: ActionRowBuilder<ButtonBuilder | StringSelectMenuBuilder>[] = [];
        const troopRow = new ActionRowBuilder<ButtonBuilder>();
        
        troopRow.addComponents(
             new ButtonBuilder()
                .setCustomId(`wizard:revival:add_troop:${state.turn}`)
                .setLabel("Revive +1 Troop")
                .setStyle(ButtonStyle.Primary)
                .setDisabled(selectedForces >= 3 || selectedForces >= faction.forcesInTanks),
             new ButtonBuilder()
                .setCustomId(`wizard:revival:sub_troop:${state.turn}`)
                .setLabel("Revive -1 Troop")
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(selectedForces <= 0)
        );
        components.push(troopRow);

        const deadLeaders = faction.leaders.filter(l => l.isDead);
        if (deadLeaders.length > 0) {
            const leaderRow = new ActionRowBuilder<ButtonBuilder>();
            deadLeaders.forEach(l => {
                 leaderRow.addComponents(
                     new ButtonBuilder()
                        .setCustomId(`wizard:revival:select_leader:${l.name}`)
                        .setLabel(`Revive ${l.name} (${l.strength})`)
                        .setStyle(selectedLeaderName === l.name ? ButtonStyle.Success : ButtonStyle.Secondary)
                        .setDisabled(!!selectedLeaderName && selectedLeaderName !== l.name)
                 );
            });
            components.push(leaderRow);
        }

        const controlRow = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`wizard:revival:confirm:${state.turn}`)
                    .setLabel("Confirm Revival")
                    .setStyle(ButtonStyle.Success),
                 new ButtonBuilder().setCustomId(`wizard:revival:reset:${state.turn}`).setLabel("Reset").setStyle(ButtonStyle.Danger)
            );
        components.push(controlRow);

        return {
            embed,
            components
        };
    }
}
