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
        if (wizardType === "revival") {
            return this.handleRevival(state, playerId, action, interaction, args);
        }
        if (wizardType === "shipment") {
            return this.handleShipment(state, playerId, action, interaction, args);
        }
        if (wizardType === "movement") {
            return this.handleMovement(state, playerId, action, interaction, args);
        }
        if (wizardType === "battle") {
            return this.handleBattle(state, playerId, action, interaction, args);
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

    // --- Revival Logic ---

    private static handleRevival(state: GameState, playerId: string, action: string, interaction: any, args: string[]): WizardStep {
        const key = "revival";
        const wState = this.getWizardState(state, playerId, key);
        if (typeof wState.forces !== 'number') wState.forces = 0;
        if (!wState.leader) wState.leader = null;

        const faction = state.factions.find(f => f.playerDiscordId === playerId);
        const forcesInTanks = faction ? faction.forcesInTanks : 0;
        // Basic limits: 3 troops, 1 leader.
        // Free revives logic should be in engine, but wizard needs to know limits.
        // Let's assume standard 3 troop limit.
        
        if (action === "reset") {
            this.clearWizardState(state, playerId, key);
        } else if (action === "add_troop") {
             if (wState.forces < 3 && wState.forces < forcesInTanks) {
                 wState.forces++;
                 this.updateWizardState(state, playerId, key, { forces: wState.forces });
             }
        } else if (action === "sub_troop") {
             if (wState.forces > 0) {
                 wState.forces--;
                 this.updateWizardState(state, playerId, key, { forces: wState.forces });
             }
        } else if (action === "select_leader" && args[0]) {
             // Toggle or Set? Spec says "all other leader buttons will be disabled".
             // If clicking same, maybe deselect?
             if (wState.leader === args[0]) {
                 wState.leader = null;
             } else {
                 wState.leader = args[0];
             }
             this.updateWizardState(state, playerId, key, { leader: wState.leader });
        }

        return this.getRevivalWizard(state, playerId);
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

    static getRevivalWizard(state: GameState, playerId: string): WizardStep {
        const faction = state.factions.find(f => f.playerDiscordId === playerId);
        if (!faction) return { content: "Error: Faction not found.", components: [] };

        const wState = this.getWizardState(state, playerId, "revival");
        const selectedForces = wState.forces || 0;
        const selectedLeaderName = wState.leader;

        // Calculate Cost (Naive implementation, real rules are complex with free revives)
        // Let's approximate: 2 spice per troop. Leader cost = strength.
        // TODO: Pass in actual cost logic or fetch from Engine/BoardService?
        // For visual spec, we just need to show X Troops for Y Spice.
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
            .setColor(0x00FF00); // Success Green

        const components: ActionRowBuilder<ButtonBuilder | StringSelectMenuBuilder>[] = [];
        const troopRow = new ActionRowBuilder<ButtonBuilder>();
        
        // Troops Buttons
        troopRow.addComponents(
             new ButtonBuilder()
                .setCustomId(`wizard:revival:add_troop:${state.turn}`)
                .setLabel("Revive +1 Troop")
                .setStyle(ButtonStyle.Primary)
                .setDisabled(selectedForces >= 3 || selectedForces >= faction.forcesInTanks), // Limit 3
             new ButtonBuilder()
                .setCustomId(`wizard:revival:sub_troop:${state.turn}`)
                .setLabel("Revive -1 Troop")
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(selectedForces <= 0)
        );
        components.push(troopRow);

        // Leader Buttons
        const deadLeaders = faction.leaders.filter(l => l.isDead);
        if (deadLeaders.length > 0) {
            const leaderRow = new ActionRowBuilder<ButtonBuilder>();
            deadLeaders.forEach(l => {
                 leaderRow.addComponents(
                     new ButtonBuilder()
                        .setCustomId(`wizard:revival:select_leader:${l.name}`)
                        .setLabel(`Revive ${l.name} (${l.strength})`)
                        .setStyle(selectedLeaderName === l.name ? ButtonStyle.Success : ButtonStyle.Secondary)
                        .setDisabled(!!selectedLeaderName && selectedLeaderName !== l.name) // Disable others if one selected
                 );
            });
            // Discord limits 5 buttons per row. If many dead leaders, might need cleaner UI (Select Menu).
            // But max 5 leaders total, so likely okish.
            components.push(leaderRow);
        }

        // Controls
        const controlRow = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`wizard:revival:confirm:${state.turn}`)
                    .setLabel("Confirm Revival")
                    .setStyle(ButtonStyle.Success)
                    // .setDisabled(selectedForces === 0 && !selectedLeaderName) // Can confirm 0? Yes (skip)
            );
        
        controlRow.addComponents(
             new ButtonBuilder().setCustomId(`wizard:revival:reset:${state.turn}`).setLabel("Reset").setStyle(ButtonStyle.Danger)
        );
        components.push(controlRow);

        return {
            embed,
            components
        };
    }

    // --- Shipment Logic ---

    private static handleShipment(state: GameState, playerId: string, action: string, interaction: any, args: string[]): WizardStep {
        const key = "shipment";
        const wState = this.getWizardState(state, playerId, key);
        if (typeof wState.forces !== 'number') wState.forces = 0;
        if (!wState.destination) wState.destination = null;

        const faction = state.factions.find(f => f.playerDiscordId === playerId);
        const reserves = faction ? faction.reserves : 0;
        
        if (action === "reset") {
            this.clearWizardState(state, playerId, key);
        } else if (action === "add_troop") {
             if (wState.forces < reserves) {
                 wState.forces++;
                 this.updateWizardState(state, playerId, key, { forces: wState.forces });
             }
        } else if (action === "sub_troop") {
             if (wState.forces > 0) {
                 wState.forces--;
                 this.updateWizardState(state, playerId, key, { forces: wState.forces });
             }
        } else if (action === "select_destination") {
             // Handle Select Menu
             if (interaction.isStringSelectMenu && interaction.isStringSelectMenu()) {
                 wState.destination = interaction.values[0];
                 this.updateWizardState(state, playerId, key, { destination: wState.destination });
             } else if (args[0]) {
                 // Fallback if passed via button args
                 wState.destination = args[0];
                 this.updateWizardState(state, playerId, key, { destination: wState.destination });
             }
        }

        return this.getShipmentWizard(state, playerId);
    }

    static getShipmentWizard(state: GameState, playerId: string): WizardStep {
        const faction = state.factions.find(f => f.playerDiscordId === playerId);
        if (!faction) return { content: "Error: Faction not found.", components: [] };

        const wState = this.getWizardState(state, playerId, "shipment");
        const selectedForces = wState.forces || 0;
        const selectedDestination = wState.destination;
        
        const estimatedCost = selectedForces * 1; 

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

        // Destination Select
        const territories = state.boardState ? Object.keys(state.boardState) : [];
        // Slice top 25 for safety or use Fallback
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

        // Troop Controls
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

        // Confirm / Reset
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

    // --- Movement Logic ---

    private static handleMovement(state: GameState, playerId: string, action: string, interaction: any, args: string[]): WizardStep {
        const key = "movement";
        const wState = this.getWizardState(state, playerId, key);
        if (typeof wState.forces !== 'number') wState.forces = 0;
        if (!wState.from) wState.from = null;
        if (!wState.to) wState.to = null;

        const faction = state.factions.find(f => f.playerDiscordId === playerId);
        
        // Find territories where player has forces.
        // Need to traverse boardState.
        // Helper to get max available troops at 'from' location.
        let maxTroops = 0;
        if (wState.from && state.boardState && state.boardState[wState.from]) {
             // simplified lookup. assuming sector 0 or summing sectors.
             // boardState[terr].forces[sector][faction]
             const terrState = state.boardState[wState.from];
             Object.values(terrState.forces).forEach(sectorForces => {
                 if (sectorForces[faction?.faction || ""]) {
                     maxTroops += sectorForces[faction?.faction || ""];
                 }
             });
        }

        if (action === "reset") {
            this.clearWizardState(state, playerId, key);
        } else if (action === "add_troop") {
             if (wState.forces < maxTroops) {
                 wState.forces++;
                 this.updateWizardState(state, playerId, key, { forces: wState.forces });
             }
        } else if (action === "sub_troop") {
             if (wState.forces > 0) {
                 wState.forces--;
                 this.updateWizardState(state, playerId, key, { forces: wState.forces });
             }
        } else if (action === "select_from") {
             if (interaction.isStringSelectMenu && interaction.isStringSelectMenu()) {
                 wState.from = interaction.values[0];
                 // Reset 'to' and 'forces' if origin changes
                 wState.to = null; 
                 wState.forces = 0;
                 this.updateWizardState(state, playerId, key, { from: wState.from, to: null, forces: 0 });
             }
        } else if (action === "select_to") {
             if (interaction.isStringSelectMenu && interaction.isStringSelectMenu()) {
                 wState.to = interaction.values[0];
                 this.updateWizardState(state, playerId, key, { to: wState.to });
             }
        }

        return this.getMovementWizard(state, playerId);
    }

    static getMovementWizard(state: GameState, playerId: string): WizardStep {
        const faction = state.factions.find(f => f.playerDiscordId === playerId);
        if (!faction) return { content: "Error: Faction not found.", components: [] };

        const wState = this.getWizardState(state, playerId, "movement");
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

        // 1. Select Origin (From)
        // Find territories with player forces
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
        
        // If no troops on board? (Start of game, or wiped out)
        if (fromOptions.length === 0) {
             embed.setDescription("You have no forces on the board to move.");
        } else {
             const fromMenu = new StringSelectMenuBuilder()
                .setCustomId(`wizard:movement:select_from:${state.turn}`)
                .setPlaceholder(selectedFrom ? `From: ${selectedFrom}` : "Select Origin")
                .addOptions(fromOptions.slice(0, 25));
             components.push(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(fromMenu));
        }

        // 2. Select Destination (To)
        // Only show if From is selected.
        if (selectedFrom) {
            // Valid destinations: Adjacent (1 move) or 2-3 moves (Ornithopter).
            // For now, list ALL territories (or top 25). Logic for adjacency should be in Engine confirm/validation
            // or we filter here if we had adjacency map.
            // Let's list all for simplicity of UI implementation now.
            const toOptions = (state.boardState ? Object.keys(state.boardState) : [])
                .filter(t => t !== selectedFrom) // Don't move to same
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

        // 3. Troop Controls (Only if From is selected)
        if (selectedFrom) {
             // Calculate max troops at From
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

        // 4. Confirm / Reset
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

    // --- Battle Logic ---

    private static handleBattle(state: GameState, playerId: string, action: string, interaction: any, args: string[]): WizardStep {
        const key = "battle";
        const wState = this.getWizardState(state, playerId, key);
        if (typeof wState.troops !== 'number') wState.troops = 0;
        if (!wState.subMenu) wState.subMenu = 'none';

        const faction = state.factions.find(f => f.playerDiscordId === playerId);
        // Find max troops in battle? Need battle state.
        // state.battleState has aggressorId/defenderId.
        // Assuming player is involved.
        // Max troops = troops in the contested territory (sector 0 or all sectors?)
        // Battle usually takes place in one territory.
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
            this.clearWizardState(state, playerId, key);
        } else if (action === "commit_add") {
             if (wState.troops < maxTroops) {
                 wState.troops++;
                 this.updateWizardState(state, playerId, key, { troops: wState.troops });
             }
        } else if (action === "commit_sub") {
             if (wState.troops > 0) {
                 wState.troops--;
                 this.updateWizardState(state, playerId, key, { troops: wState.troops });
             }
        } else if (action === "menu_leader") {
             this.updateWizardState(state, playerId, key, { subMenu: 'leader' });
        } else if (action === "menu_weapon") {
             this.updateWizardState(state, playerId, key, { subMenu: 'weapon' });
        } else if (action === "menu_defense") {
             this.updateWizardState(state, playerId, key, { subMenu: 'defense' });
        } else if (action === "menu_none") {
             this.updateWizardState(state, playerId, key, { subMenu: 'none' });
        } else if (action === "select_leader") {
             const leaderName = args[0];
             // If "Cheap Hero", leaderName = "Cheap Hero" (or handle specially)
             this.updateWizardState(state, playerId, key, { leader: leaderName, subMenu: 'none' });
        } else if (action === "select_weapon") {
             const cardName = args[0];
             this.updateWizardState(state, playerId, key, { weapon: cardName, subMenu: 'none' });
        } else if (action === "select_defense") {
             const cardName = args[0];
             this.updateWizardState(state, playerId, key, { defense: cardName, subMenu: 'none' });
        }

        return this.getBattleWizard(state, playerId);
    }

    static getBattleWizard(state: GameState, playerId: string): WizardStep {
        const faction = state.factions.find(f => f.playerDiscordId === playerId);
        if (!faction) return { content: "Error: Faction not found.", components: [] };
        if (!state.battleState) return { content: "Error: No active battle.", components: [] };

        const wState = this.getWizardState(state, playerId, "battle");
        const troops = wState.troops || 0;
        const leader = wState.leader;
        const weapon = wState.weapon;
        const defense = wState.defense;
        const subMenu = wState.subMenu || 'none';

        const embed = new EmbedBuilder()
            .setTitle(`Battle for ${state.battleState.territory}`)
            .setColor(0xFF0000);

        const components: ActionRowBuilder<ButtonBuilder | StringSelectMenuBuilder>[] = [];
        const turn = state.turn;

        // Sub-Menus
        if (subMenu === 'leader') {
             embed.setDescription("Pick a Leader or Cheap Hero.");
             
             // List Leaders
             // Filter out dead leaders
             const availableLeaders = faction.leaders.filter(l => !l.isDead);
             // TODO: Check if leader already used/dead? (isDead handled).
             
             const row = new ActionRowBuilder<ButtonBuilder>();
             availableLeaders.forEach(l => {
                 row.addComponents(
                     new ButtonBuilder()
                        .setCustomId(`wizard:battle:select_leader:${l.name}`)
                        .setLabel(`${l.name} (${l.strength})`)
                        .setStyle(ButtonStyle.Primary)
                 );
             });
             // Cheap Hero (if has card? or always available? Rules vary. Usually requires card "Cheap Hero/Traitor" or similar)
             // Spec says: "disabled if player does not have a cheap hero card".
             // We need to check hand.
             const hasCheapHero = faction.hand.some(c => c.name === "Cheap Hero"); // Assuming card name
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

        // Main View
        embed.setDescription(
            `Plan your battle strategy.\n` +
            `**Troops**: ${troops}\n` +
            `**Leader**: ${leader || "None"}\n` +
            `**Weapon**: ${weapon || "None"}\n` +
            `**Defense**: ${defense || "None"}`
        );

        // Troop Controls
        // Find max troops again for disable check
        let maxTroops = 0;
        if (state.battleState) {
            const terr = state.boardState[state.battleState.territory];
            if (terr) {
                Object.values(terr.forces).forEach(sectorForces => {
                     if (sectorForces[faction?.faction || ""]) maxTroops += sectorForces[faction?.faction || ""];
                });
            }
        }
        
        components.push(new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder().setCustomId(`wizard:battle:commit_add:${turn}`).setLabel("+1 Troop").setStyle(ButtonStyle.Primary).setDisabled(troops >= maxTroops),
            new ButtonBuilder().setCustomId(`wizard:battle:commit_sub:${turn}`).setLabel("-1 Troop").setStyle(ButtonStyle.Secondary).setDisabled(troops <= 0)
        ));

        // Selection Menu Entries
        components.push(new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder().setCustomId(`wizard:battle:menu_leader:${turn}`).setLabel(leader ? `Leader: ${leader}` : "Pick Leader").setStyle(leader ? ButtonStyle.Success : ButtonStyle.Primary),
            new ButtonBuilder().setCustomId(`wizard:battle:menu_weapon:${turn}`).setLabel(weapon ? `Weapon: ${weapon}` : "Pick Weapon").setStyle(weapon ? ButtonStyle.Success : ButtonStyle.Primary),
            new ButtonBuilder().setCustomId(`wizard:battle:menu_defense:${turn}`).setLabel(defense ? `Defense: ${defense}` : "Pick Defense").setStyle(defense ? ButtonStyle.Success : ButtonStyle.Primary) // Corrected from setStyle(defense ...)
        ));

        // Submit / Reset
        components.push(new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder().setCustomId(`wizard:battle:confirm:${turn}`).setLabel("Submit Battle Plan").setStyle(ButtonStyle.Success).setDisabled(!leader), // Leader is mandatory usually. Or maybe 0 troops + Leader? Leader is mandatory.
            new ButtonBuilder().setCustomId(`wizard:battle:reset:${turn}`).setLabel("Reset").setStyle(ButtonStyle.Danger)
        ));

        return { embed, components };
    }
}
