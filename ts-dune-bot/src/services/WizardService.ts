import { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, EmbedBuilder } from "discord.js";
import { GameState, FactionState, GameAction } from "../types";
import { FACTION_LEADERS } from "../constants/leaders";

export interface WizardStep {
    content?: string;
    embed?: EmbedBuilder;
    components: ActionRowBuilder<ButtonBuilder | StringSelectMenuBuilder>[];
}

export class WizardService {
    // Helper to get wizard key
    static getWizardKey(playerId: string, wizardType: string): string {
        return `p_${playerId}_${wizardType}`;
    }

    static getWizardState(state: GameState, playerId: string, wizardType: string): any {
        const key = this.getWizardKey(playerId, wizardType);
        return state.wizardState[key] || {};
    }

    static updateWizardState(state: GameState, playerId: string, wizardType: string, data: any) {
        const key = this.getWizardKey(playerId, wizardType);
        state.wizardState[key] = { ...state.wizardState[key], ...data };
    }

    static clearWizardState(state: GameState, playerId: string, wizardType: string) {
        const key = this.getWizardKey(playerId, wizardType);
        delete state.wizardState[key];
    }

    // --- Specific Wizard Generators ---

    static async handleWizardInteraction(state: GameState, interaction: any, wizardType: string, action: string, args: string[]): Promise<WizardStep> {
        const playerId = interaction.user.id;
        
        if (wizardType === "setup_traitor") {
            return this.handleTraitorSelection(state, playerId, action, interaction);
        }
        if (wizardType === "setup_forces") {
            return this.handleForcePlacement(state, playerId, action, interaction, args);
        }

        return { content: "Unknown wizard type.", components: [] };
    }

    // --- Traitor Selection Logic ---

    private static handleTraitorSelection(state: GameState, playerId: string, action: string, interaction: any): WizardStep {
        const key = this.getWizardKey(playerId, "setup_traitor");

        if (action === "select") {
            // Check if select menu
            if (interaction.isStringSelectMenu()) {
                const selected = interaction.values[0];
                this.updateWizardState(state, playerId, "setup_traitor", { selectedTraitor: selected });
            }
        } else if (action === "reset") {
             this.clearWizardState(state, playerId, "setup_traitor");
        } else if (action === "confirm") {
             // Handled by Command
        }

        // Re-render based on new state
        return this.getTraitorSelectionWizard(state, playerId);
    }

    // --- Force Placement Logic ---

    private static handleForcePlacement(state: GameState, playerId: string, action: string, interaction: any, args: string[]): WizardStep {
        const key = "setup_forces";
        const wState = this.getWizardState(state, playerId, key);
        if (!wState.forces) wState.forces = {};
        
        // Get faction to check reserves cap
        const faction = state.factions.find(f => f.playerDiscordId === playerId);
        const maxReserves = faction ? faction.reserves : 0;
        const currentTotal = Object.values(wState.forces as Record<string, number>).reduce((a, b) => a + b, 0);

        if (action === "reset") {
            this.clearWizardState(state, playerId, key);
        } else if (action === "add" && args[0]) {
            const territory = args[0];
            const amount = 1; // Default increment
            if (currentTotal + amount <= maxReserves) {
                wState.forces[territory] = (wState.forces[territory] || 0) + amount;
                this.updateWizardState(state, playerId, key, { forces: wState.forces });
            }
        } else if (action === "sub" && args[0]) {
             const territory = args[0];
             if (wState.forces[territory] > 0) {
                 wState.forces[territory]--;
                 if (wState.forces[territory] <= 0) delete wState.forces[territory];
                 this.updateWizardState(state, playerId, key, { forces: wState.forces });
             }
        }
        
        return this.getForcePlacementWizard(state, playerId);
    }

    // Example: Traitor Selection Wizard
    static getTraitorSelectionWizard(state: GameState, playerId: string): WizardStep {
        const faction = state.factions.find(f => f.playerDiscordId === playerId);
        if (!faction) return { content: "Error: You are not in this game.", components: [] };

        const wizardState = this.getWizardState(state, playerId, "setup_traitor");
        const selected = wizardState.selectedTraitor;

        if (selected) {
            // Confirmation Step
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

        // Selection Step
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

    static getForcePlacementWizard(state: GameState, playerId: string): WizardStep {
        const faction = state.factions.find(f => f.playerDiscordId === playerId);
        if (!faction) return { content: "Error: Faction not found.", components: [] };

        const wState = this.getWizardState(state, playerId, "setup_forces");
        const forces = wState.forces || {};
        const currentTotal = Object.values(forces as Record<string, number>).reduce((a, b) => a + b, 0);
        const remaining = faction.reserves - currentTotal;

        // Allowed Territories per Faction (Hardcoded Rules for now)
        const allowed: string[] = [];
        
        // Canonical: 
        switch (faction.faction) {
            case "Atreides": allowed.push("Arrakeen"); break;
            case "Harkonnen": allowed.push("Carthag"); break;
            case "Fremen": allowed.push("Sietch Tabr", "False Wall South", "False Wall West"); break; 
            case "Guild": allowed.push("Tuek's Sietch"); break;
            case "BeneGesserit": allowed.push("Polar Sink"); break;
            // Emperor usually off-planet start
        }

        const embed = new EmbedBuilder()
            .setTitle(`Force Placement: ${faction.faction}`)
            .setDescription(`Reserves Available: **${remaining}**\nDeployed: **${currentTotal}**`)
            .setColor(0x0099FF);
            
        // Text List of Deployed
        let deployedText = "";
        for (const [t, count] of Object.entries(forces)) {
            deployedText += `• **${t}**: ${count}\n`;
        }
        if (deployedText) embed.addFields({ name: "Deployment Plan", value: deployedText });

        const components: ActionRowBuilder<ButtonBuilder | StringSelectMenuBuilder>[] = [];

        // Generate Buttons for Allowed Territories
        allowed.forEach(terr => {
            const count = forces[terr] || 0;
            const row = new ActionRowBuilder<ButtonBuilder>();
            
            // Add Button
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(`wizard:setup_forces:add:${terr}`) // ID passed as args to handle
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

        // Controls
        const controlRow = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`wizard:setup_forces:confirm:${state.turn}`)
                    .setLabel("Confirm Deployment")
                    .setStyle(ButtonStyle.Success)
                    // .setDisabled(currentTotal === 0) // Can confirm 0? Yes (reserves strategy)
            );
            
        // Reset
        controlRow.addComponents(
             new ButtonBuilder().setCustomId(`wizard:setup_forces:reset:${state.turn}`).setLabel("Reset").setStyle(ButtonStyle.Danger)
        );

        components.push(controlRow);

        return {
            embed,
            components
        };
    }
}
