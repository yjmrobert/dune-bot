import { CommandContext, InteractionCommand } from "./Command";
import { MessageFlags } from "discord.js";
import { WizardService } from "../../services/WizardService";
import { GameState, BattlePlan } from "../../types"; // Import GameState type
import { prisma } from "../../db"; // Import prisma for database access

export class WizardCommand implements InteractionCommand {
    async execute(context: CommandContext): Promise<void> {
        const { interaction, gameManager, gameId, args } = context;
        // Format: wizard:type:action:arg1:arg2...
        // Dispatcher has parsed: type (args[0]), action (args[1]), etc...
        // BUT Dispatcher logic was: action:gameId.
        // Wait, Dispatcher parsing logic:
        // const [action, param] = customId.split(":");
        // if customId = "wizard:setup_traitor:select:123"
        // parts = ["wizard", "setup_traitor", "select", "123"]
        // Dispatcher registers "wizard".
        // Dispatcher splits logic:
        /*
            const parts = interaction.customId.split(":");
            const action = parts[0]; // "wizard"
            // param is parts[1]... but here parts are many.
            
            // Dispatcher Logic I wrote:
            if (parts.length > 2) {
                gameIdStr = parts[parts.length - 1]; // "123"
                args = parts.slice(1, parts.length - 1); // ["setup_traitor", "select"]
            }
        */
        
        // So args[0] = wizardType ("setup_traitor")
        // args[1] = wizardAction ("select" or "confirm" or "reset")
        
        const wizardType = args[0];
        const wizardAction = args[1]; // might be undefined if just opening?
        
        // If just "wizard:open:setup_traitor:123" ? 
        // Let's assume buttons to OPEN wizards use "wizard:setup_traitor:open:123"
        
        if (!wizardType) {
            await interaction.reply({ content: "Invalid wizard request.", flags: MessageFlags.Ephemeral });
            return;
        }

        const game = await prisma.game.findUnique({ where: { id: gameId } });
        if (!game) return;

        const state: GameState = JSON.parse(game.stateJson);

        if (wizardAction === "confirm") {
            // Special handling for Confirm -> Call Engine
            await this.handleConfirm(context, state, wizardType);
            return;
        }

        // Handle Wizard Interaction (Select, Reset, etc.)
        const step = await WizardService.handleWizardInteraction(state, interaction, wizardType, wizardAction, args.slice(2));

        // Save Temporary Wizard State (Memento)
        await prisma.game.update({
             where: { id: gameId },
             data: { stateJson: JSON.stringify(state) }
        });

        // Reply/Update
        if (interaction.isButton() || interaction.isStringSelectMenu()) {
            if (interaction.replied || interaction.deferred) {
                await interaction.editReply({ content: step.content, components: step.components, embeds: step.embed ? [step.embed] : [] });
            } else {
                 // If it's the specific "Open" trigger, we reply ephemeral. 
                 // If it's a step update, we update.
                 if (wizardAction === "open" || !wizardAction) {
                     await interaction.reply({ content: step.content, components: step.components, embeds: step.embed ? [step.embed] : [], flags: MessageFlags.Ephemeral });
                 } else {
                     await interaction.update({ content: step.content, components: step.components, embeds: step.embed ? [step.embed] : [] });
                 }
            }
        }
    }

    private async handleConfirm(context: CommandContext, state: GameState, wizardType: string) {
        const { interaction, gameManager, gameId } = context;
        const playerId = interaction.user.id;

        if (wizardType === "setup_traitor") {
            const wizardState = WizardService.getWizardState(state, playerId, "setup_traitor");
            const selectedTraitor = wizardState.selectedTraitor;
            
            if (!selectedTraitor) {
                 await interaction.reply({ content: "No traitor selected.", flags: MessageFlags.Ephemeral });
                 return;
            }

            // Call Engine to Confirm
            // We use interaction.update to say "Confirmed", and then engine updates main view.
            await interaction.deferUpdate();
            
            await gameManager.confirmTraitor(gameId, playerId, selectedTraitor);
            
            // Clear Wizard State
            WizardService.clearWizardState(state, playerId, "setup_traitor");
            
            await interaction.editReply({ content: `Traitor **${selectedTraitor}** confirmed. Waiting for others...`, components: [] });
        } else if (wizardType === "setup_forces") {
             const wizardState = WizardService.getWizardState(state, playerId, "setup_forces");
             const forces = wizardState.forces || {}; // { territory: count }
             
             // Convert to Array
             const deployment: { territory: string, sector: number, amount: number }[] = [];
             for (const [terr, amount] of Object.entries(forces)) {
                 if (typeof amount === 'number' && amount > 0) {
                     // Need SECTOR. Wizard just knew Name.
                     // We need a lookup for Sector. Assumed Hardcoded/Default for now?
                     // Or WizardService should have tracked it.
                     // For canonical starts, Sector is fixed.
                     // MapService/BoardService might know.
                     // Let's hardcode canonical sectors here or in a constant.
                     // Ideally `gameEngine` or `BoardService` has `getCanonicalSector(territory)`.
                     
                     let sector = 0;
                     // Quick lookup based on knowns
                     if (terr === "Arrakeen") sector = 10;
                     if (terr === "Carthag") sector = 11;
                     if (terr === "Sietch Tabr") sector = 14;
                     if (terr === "Tuek's Sietch") sector = 5;
                     if (terr === "Polar Sink") sector = 0;
                     if (terr.includes("False Wall")) sector = 12; // Approximation
                     
                     deployment.push({ territory: terr, sector, amount });
                 }
             }

             await interaction.deferUpdate();
             await gameManager.deployForces(gameId, playerId, deployment);
             
             WizardService.clearWizardState(state, playerId, "setup_forces");
             
             await interaction.editReply({ content: `Forces deployed. Waiting for others...`, components: [], embeds: [] });
        } else if (wizardType === "revival") {
             const wizardState = WizardService.getWizardState(state, playerId, "revival");
             const forces = wizardState.forces || 0;
             const leader = wizardState.leader;

             await interaction.deferUpdate();
             const msgs: string[] = [];
             
             if (forces > 0) {
                 await gameManager.reviveForces(gameId, playerId, forces);
                 msgs.push(`Revived ${forces} troops.`);
             }
             if (leader) {
                 await gameManager.reviveLeader(gameId, playerId, leader);
                 msgs.push(`Revived leader ${leader}.`);
             }
             
             WizardService.clearWizardState(state, playerId, "revival");
             await interaction.editReply({ content: msgs.join("\n") || "No revival actions taken.", components: [], embeds: [] });

        } else if (wizardType === "shipment") {
             const wizardState = WizardService.getWizardState(state, playerId, "shipment");
             const forces = wizardState.forces || 0;
             const dest = wizardState.destination;
             
             if (!dest || forces <= 0) {
                 await interaction.reply({ content: "Invalid shipment plan.", flags: MessageFlags.Ephemeral });
                 return;
             }
             
             // Determine Sector (Reuse lookup logic or default)
             let sector = 1; // Default to sector 1 if unknown?
             // Simple Lookup Table
             if (dest === "Arrakeen") sector = 10;
             else if (dest === "Carthag") sector = 11;
             else if (dest === "Sietch Tabr") sector = 14;
             else if (dest === "Tuek's Sietch") sector = 5;
             else if (dest === "Polar Sink") sector = 0;
             // If not in lookup, assume 1? Or need improved Board Service. 
             // Ideally we shouldn't hardcode, but for MVP/Bot this works for main strongholds.
             
             await interaction.deferUpdate();
             await gameManager.shipForces(gameId, playerId, dest, sector, forces);
             WizardService.clearWizardState(state, playerId, "shipment");
             await interaction.editReply({ content: `Shipped ${forces} troops to ${dest}.`, components: [], embeds: [] });

        } else if (wizardType === "movement") {
             const wizardState = WizardService.getWizardState(state, playerId, "movement");
             const forces = wizardState.forces || 0;
             const from = wizardState.from;
             const to = wizardState.to;
             
             if (!from || !to || forces <= 0) {
                 await interaction.reply({ content: "Invalid movement plan.", flags: MessageFlags.Ephemeral });
                 return;
             }
             
             await interaction.deferUpdate();
             await gameManager.moveForces(gameId, playerId, from, to, forces);
             WizardService.clearWizardState(state, playerId, "movement");
             await interaction.editReply({ content: `Moved ${forces} troops from ${from} to ${to}.`, components: [], embeds: [] });

        } else if (wizardType === "battle") {
             const wizardState = WizardService.getWizardState(state, playerId, "battle");
             const troops = wizardState.troops || 0;
             const leader = wizardState.leader;
             const weapon = wizardState.weapon;
             const defense = wizardState.defense;
             
             if (!leader) {
                 await interaction.reply({ content: "Leader is required for battle.", flags: MessageFlags.Ephemeral });
                 return;
             }
             
             const plan: BattlePlan = {
                 leaderName: leader,
                 weaponName: weapon,
                 defenseName: defense,
                 dial: troops
             };
             
             await interaction.deferUpdate();
             await gameManager.submitBattlePlan(gameId, playerId, plan);
             WizardService.clearWizardState(state, playerId, "battle");
             await interaction.editReply({ content: `Battle plan submitted.`, components: [], embeds: [] });
        }
    }
}
