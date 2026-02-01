import { CommandContext, InteractionCommand } from "./Command";
import { MessageFlags } from "discord.js";
import { WizardService } from "../../services/WizardService";
import { GameState } from "../../types"; // Import GameState type
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
        }
    }
}
