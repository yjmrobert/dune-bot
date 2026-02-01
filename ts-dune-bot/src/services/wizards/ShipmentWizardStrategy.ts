import { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, EmbedBuilder } from "discord.js";
import { GameState } from "../../types";
import { WizardService, WizardStep } from "../WizardService";
import { IWizardStrategy } from "./IWizardStrategy";

export class ShipmentWizardStrategy implements IWizardStrategy {
    handleInteraction(state: GameState, playerId: string, action: string, interaction: any, args: string[]): WizardStep {
        const key = "shipment";
        const wState = WizardService.getWizardState(state, playerId, key);
        if (typeof wState.forces !== 'number') wState.forces = 0;
        if (!wState.destination) wState.destination = null;

        const faction = state.factions.find(f => f.playerDiscordId === playerId);
        const reserves = faction ? faction.reserves : 0;
        
        if (action === "reset") {
            WizardService.clearWizardState(state, playerId, key);
        } else if (action === "add_troop") {
             if (wState.forces < reserves) {
                 wState.forces++;
                 WizardService.updateWizardState(state, playerId, key, { forces: wState.forces });
             }
        } else if (action === "sub_troop") {
             if (wState.forces > 0) {
                 wState.forces--;
                 WizardService.updateWizardState(state, playerId, key, { forces: wState.forces });
             }
        } else if (action === "select_destination") {
             if (interaction.isStringSelectMenu && interaction.isStringSelectMenu()) {
                 wState.destination = interaction.values[0];
                 WizardService.updateWizardState(state, playerId, key, { destination: wState.destination });
             } else if (args[0]) {
                 wState.destination = args[0];
                 WizardService.updateWizardState(state, playerId, key, { destination: wState.destination });
             }
        }

        return this.getStep(state, playerId);
    }

    getStep(state: GameState, playerId: string): WizardStep {
        const faction = state.factions.find(f => f.playerDiscordId === playerId);
        if (!faction) return { content: "Error: Faction not found.", components: [] };

        const wState = WizardService.getWizardState(state, playerId, "shipment");
        const selectedForces = wState.forces || 0;
        const selectedDestination = wState.destination;
        
        const embed = new EmbedBuilder()
            .setTitle(`Shipment for ${faction.faction}`)
            .setDescription(
                `Select your forces to ship.\n` +
                `Reserves: **${faction.reserves}**\n` +
                `Spice: **${faction.spice}**\n` +
                `Plan: Ship **${selectedForces}** Troops to **${selectedDestination || "Nowhere"}**.`
            )
            .setColor(0x0099FF);

        const components: ActionRowBuilder<ButtonBuilder | StringSelectMenuBuilder>[] = [];

        const territories = state.boardState ? Object.keys(state.boardState) : [];
        let topTerritories = territories.slice(0, 25);
        if (topTerritories.length === 0) {
            topTerritories = ["Arrakeen", "Carthag", "Sietch Tabr", "Tuek's Sietch", "Polar Sink"];
        }
        
        const options = topTerritories.map(t => ({ label: t, value: t }));

        if (options.length > 0) {
            const menu = new StringSelectMenuBuilder()
                .setCustomId(`wizard:shipment:select_destination:${state.turn}`)
                .setPlaceholder("Select Destination")
                .addOptions(options);
            components.push(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu));
        }

        const troopRow = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`wizard:shipment:add_troop:${state.turn}`)
                    .setLabel("Ship +1 Troop")
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(selectedForces >= faction.reserves),
                new ButtonBuilder()
                    .setCustomId(`wizard:shipment:sub_troop:${state.turn}`)
                    .setLabel("Ship -1 Troop")
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(selectedForces <= 0)
            );
        components.push(troopRow);

        const controlRow = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`wizard:shipment:confirm:${state.turn}`)
                    .setLabel("Confirm Shipment")
                    .setStyle(ButtonStyle.Success)
                    .setDisabled(selectedForces <= 0 || !selectedDestination),
                new ButtonBuilder()
                    .setCustomId(`wizard:shipment:reset:${state.turn}`)
                    .setLabel("Reset")
                    .setStyle(ButtonStyle.Danger)
            );
        components.push(controlRow);

        return {
            embed,
            components
        };
    }
}
