import { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } from "discord.js";
import { GameState } from "../../types";
import { WizardService, WizardStep } from "../WizardService";
import { IWizardStrategy } from "./IWizardStrategy";

export class TraitorWizardStrategy implements IWizardStrategy {
    handleInteraction(state: GameState, playerId: string, action: string, interaction: any, args: string[]): WizardStep {
        if (action === "select") {
            if (interaction.isStringSelectMenu && interaction.isStringSelectMenu()) {
                const selected = interaction.values[0];
                WizardService.updateWizardState(state, playerId, "setup_traitor", { selectedTraitor: selected });
            }
        } else if (action === "reset") {
             WizardService.clearWizardState(state, playerId, "setup_traitor");
        }
        
        return this.getStep(state, playerId);
    }

    getStep(state: GameState, playerId: string): WizardStep {
        const faction = state.factions.find(f => f.playerDiscordId === playerId);
        if (!faction) return { content: "Error: You are not in this game.", components: [] };

        const wizardState = WizardService.getWizardState(state, playerId, "setup_traitor");
        const selected = wizardState.selectedTraitor;

        if (selected) {
            return {
                content: `You have selected **${selected}**.`,
                components: [
                    new ActionRowBuilder<ButtonBuilder>().addComponents(
                        new ButtonBuilder().setCustomId(`wizard:setup_traitor:confirm:${state.turn}`).setLabel("Confirm").setStyle(ButtonStyle.Success),
                        new ButtonBuilder().setCustomId(`wizard:setup_traitor:reset:${state.turn}`).setLabel("Reset").setStyle(ButtonStyle.Secondary)
                    )
                ]
            };
        }

        if (!faction.traitorOptions || faction.traitorOptions.length === 0) {
            return { content: "Error: No traitor options found.", components: [] };
        }

        const menu = new StringSelectMenuBuilder()
            .setCustomId(`wizard:setup_traitor:select:${state.turn}`)
            .setPlaceholder('Select 1 Traitor to KEEP');

        faction.traitorOptions.forEach(t => {
            menu.addOptions({
                label: t,
                value: t,
                description: "Keep this traitor"
            });
        });

        return {
            content: "Select the Traitor you wish to keep. The others will be discarded.",
            components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu)]
        };
    }
}
