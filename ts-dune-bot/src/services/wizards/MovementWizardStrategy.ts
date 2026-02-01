import { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, EmbedBuilder } from "discord.js";
import { GameState } from "../../types";
import { WizardService, WizardStep } from "../WizardService";
import { IWizardStrategy } from "./IWizardStrategy";

export class MovementWizardStrategy implements IWizardStrategy {
    handleInteraction(state: GameState, playerId: string, action: string, interaction: any, args: string[]): WizardStep {
        const key = "movement";
        const wState = WizardService.getWizardState(state, playerId, key);
        if (typeof wState.forces !== 'number') wState.forces = 0;
        if (!wState.from) wState.from = null;
        if (!wState.to) wState.to = null;

        const faction = state.factions.find(f => f.playerDiscordId === playerId);
        
        let maxTroops = 0;
        if (wState.from && state.boardState && state.boardState[wState.from]) {
             const terrState = state.boardState[wState.from];
             Object.values(terrState.forces).forEach(sectorForces => {
                 if (sectorForces[faction?.faction || ""]) {
                     maxTroops += sectorForces[faction?.faction || ""];
                 }
             });
        }

        if (action === "reset") {
            WizardService.clearWizardState(state, playerId, key);
        } else if (action === "add_troop") {
             if (wState.forces < maxTroops) {
                 wState.forces++;
                 WizardService.updateWizardState(state, playerId, key, { forces: wState.forces });
             }
        } else if (action === "sub_troop") {
             if (wState.forces > 0) {
                 wState.forces--;
                 WizardService.updateWizardState(state, playerId, key, { forces: wState.forces });
             }
        } else if (action === "select_from") {
             if (interaction.isStringSelectMenu && interaction.isStringSelectMenu()) {
                 wState.from = interaction.values[0];
                 wState.to = null; 
                 wState.forces = 0;
                 WizardService.updateWizardState(state, playerId, key, { from: wState.from, to: null, forces: 0 });
             }
        } else if (action === "select_to") {
             if (interaction.isStringSelectMenu && interaction.isStringSelectMenu()) {
                 wState.to = interaction.values[0];
                 WizardService.updateWizardState(state, playerId, key, { to: wState.to });
             }
        }

        return this.getStep(state, playerId);
    }

    getStep(state: GameState, playerId: string): WizardStep {
        const faction = state.factions.find(f => f.playerDiscordId === playerId);
        if (!faction) return { content: "Error: Faction not found.", components: [] };

        const wState = WizardService.getWizardState(state, playerId, "movement");
        const selectedForces = wState.forces || 0;
        const selectedFrom = wState.from;
        const selectedTo = wState.to;

        const embed = new EmbedBuilder()
            .setTitle(`Movement for ${faction.faction}`)
            .setDescription(
                `Select origin and destination.\n` +
                `From: **${selectedFrom || "None"}**\n` +
                `To: **${selectedTo || "None"}**\n` +
                `Moving: **${selectedForces}** Troops`
            )
            .setColor(0x0099FF);

        const components: ActionRowBuilder<ButtonBuilder | StringSelectMenuBuilder>[] = [];

        const fromOptions: { label: string, value: string }[] = [];
        if (state.boardState) {
            Object.values(state.boardState).forEach(terr => {
                let hasTroops = false;
                 Object.values(terr.forces).forEach(sectorForces => {
                     if (sectorForces[faction.faction] > 0) hasTroops = true;
                 });
                 if (hasTroops) fromOptions.push({ label: terr.name, value: terr.name });
            });
        }
        
        if (fromOptions.length === 0) {
             embed.setDescription("You have no forces on the board to move.");
        } else {
             const fromMenu = new StringSelectMenuBuilder()
                .setCustomId(`wizard:movement:select_from:${state.turn}`)
                .setPlaceholder(selectedFrom ? `From: ${selectedFrom}` : "Select Origin")
                .addOptions(fromOptions.slice(0, 25));
             components.push(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(fromMenu));
        }

        if (selectedFrom) {
            const toOptions = (state.boardState ? Object.keys(state.boardState) : [])
                .filter(t => t !== selectedFrom) 
                .slice(0, 25)
                .map(t => ({ label: t, value: t }));
            
            if (toOptions.length > 0) {
                const toMenu = new StringSelectMenuBuilder()
                    .setCustomId(`wizard:movement:select_to:${state.turn}`)
                    .setPlaceholder(selectedTo ? `To: ${selectedTo}` : "Select Destination")
                    .addOptions(toOptions);
                components.push(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(toMenu));
            }
        }

        if (selectedFrom) {
             let maxTroops = 0;
             if (state.boardState && state.boardState[selectedFrom]) {
                  const terrState = state.boardState[selectedFrom];
                  Object.values(terrState.forces).forEach(sectorForces => {
                      if (sectorForces[faction.faction]) maxTroops += sectorForces[faction.faction];
                  });
             }
            
            const troopRow = new ActionRowBuilder<ButtonBuilder>()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`wizard:movement:add_troop:${state.turn}`)
                        .setLabel("Move +1 Troop")
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(selectedForces >= maxTroops),
                    new ButtonBuilder()
                        .setCustomId(`wizard:movement:sub_troop:${state.turn}`)
                        .setLabel("Move -1 Troop")
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(selectedForces <= 0)
                );
            components.push(troopRow);
        }

        const controlRow = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`wizard:movement:confirm:${state.turn}`)
                    .setLabel("Confirm Move")
                    .setStyle(ButtonStyle.Success)
                    .setDisabled(selectedForces <= 0 || !selectedFrom || !selectedTo),
                new ButtonBuilder()
                    .setCustomId(`wizard:movement:reset:${state.turn}`)
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
