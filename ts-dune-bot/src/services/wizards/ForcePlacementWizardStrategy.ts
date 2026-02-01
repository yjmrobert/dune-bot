import { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, EmbedBuilder } from "discord.js";
import { GameState } from "../../types";
import { WizardService, WizardStep } from "../WizardService";
import { IWizardStrategy } from "./IWizardStrategy";

export class ForcePlacementWizardStrategy implements IWizardStrategy {
    handleInteraction(state: GameState, playerId: string, action: string, interaction: any, args: string[]): WizardStep {
        const key = "setup_forces";
        const wState = WizardService.getWizardState(state, playerId, key);
        if (!wState.forces) wState.forces = {};
        
        const faction = state.factions.find(f => f.playerDiscordId === playerId);
        const maxReserves = faction ? faction.reserves : 0;
        const currentTotal = Object.values(wState.forces as Record<string, number>).reduce((a, b) => a + b, 0);

        if (action === "reset") {
            WizardService.clearWizardState(state, playerId, key);
        } else if (action === "add" && args[0]) {
            const territory = args[0];
            const amount = 1; 
            if (currentTotal + amount <= maxReserves) {
                wState.forces[territory] = (wState.forces[territory] || 0) + amount;
                WizardService.updateWizardState(state, playerId, key, { forces: wState.forces });
            }
        } else if (action === "sub" && args[0]) {
             const territory = args[0];
             if (wState.forces[territory] > 0) {
                 wState.forces[territory]--;
                 if (wState.forces[territory] <= 0) delete wState.forces[territory];
                 WizardService.updateWizardState(state, playerId, key, { forces: wState.forces });
             }
        }
        
        return this.getStep(state, playerId);
    }

    getStep(state: GameState, playerId: string): WizardStep {
        const faction = state.factions.find(f => f.playerDiscordId === playerId);
        if (!faction) return { content: "Error: Faction not found.", components: [] };

        const wState = WizardService.getWizardState(state, playerId, "setup_forces");
        const forces = wState.forces || {};
        const currentTotal = Object.values(forces as Record<string, number>).reduce((a, b) => a + b, 0);
        const remaining = faction.reserves - currentTotal;

        const allowed: string[] = [];
        
        switch (faction.faction) {
            case "Atreides": allowed.push("Arrakeen"); break;
            case "Harkonnen": allowed.push("Carthag"); break;
            case "Fremen": allowed.push("Sietch Tabr", "False Wall South", "False Wall West"); break; 
            case "Guild": allowed.push("Tuek's Sietch"); break;
            case "BeneGesserit": allowed.push("Polar Sink"); break;
        }

        const embed = new EmbedBuilder()
            .setTitle(`Force Placement: ${faction.faction}`)
            .setDescription(`Reserves Available: **${remaining}**\nDeployed: **${currentTotal}**`)
            .setColor(0x0099FF);
            
        let deployedText = "";
        for (const [t, count] of Object.entries(forces)) {
            deployedText += `• **${t}**: ${count}\n`;
        }
        if (deployedText) embed.addFields({ name: "Deployment Plan", value: deployedText });

        const components: ActionRowBuilder<ButtonBuilder | StringSelectMenuBuilder>[] = [];

        allowed.forEach(terr => {
            const count = forces[terr] || 0;
            const row = new ActionRowBuilder<ButtonBuilder>();
            
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(`wizard:setup_forces:add:${terr}`) 
                    .setLabel(`Place ${terr} (+1)`)
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(remaining <= 0),
                new ButtonBuilder()
                    .setCustomId(`wizard:setup_forces:sub:${terr}`)
                    .setLabel(`Remove (-1)`)
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(count <= 0)
            );
            components.push(row);
        });

        const controlRow = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`wizard:setup_forces:confirm:${state.turn}`)
                    .setLabel("Confirm Deployment")
                    .setStyle(ButtonStyle.Success),
                 new ButtonBuilder().setCustomId(`wizard:setup_forces:reset:${state.turn}`).setLabel("Reset").setStyle(ButtonStyle.Danger)
            );

        components.push(controlRow);

        return {
            embed,
            components
        };
    }
}
