import { CommandContext, InteractionCommand } from "./Command";
import { 
    MessageFlags, 
    ActionRowBuilder, 
    StringSelectMenuBuilder, 
    StringSelectMenuOptionBuilder,
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle, 
    ButtonBuilder,
    ButtonStyle
} from "discord.js";
import { prisma } from "../../db";
import { GameState, BattlePlan } from "../../types";

export class BattlePlanCommand implements InteractionCommand {
    async execute(context: CommandContext): Promise<void> {
        const { interaction, gameManager, gameId, args } = context;
        const subAction = args[0] || "start"; // start, lead, weap, def, dial
        
        // Load State
        const game = await prisma.game.findUnique({ where: { id: gameId } });
        if (!game) return;
        const state: GameState = JSON.parse(game.stateJson);
        const faction = state.factions.find(f => f.playerDiscordId === interaction.user.id);
        
        if (!faction) return;
        if (!state.battleState) {
            await interaction.reply({ content: "No active battle.", flags: MessageFlags.Ephemeral });
            return;
        }

        const wizardKey = `battle_plan:${gameId}:${interaction.user.id}`;

        // 1. Start: Select Leader
        if (subAction === "start") {
            const aliveLeaders = faction.leaders.filter(l => !l.isDead);
            if (aliveLeaders.length === 0) {
                 await interaction.reply({ content: "You have no alive leaders!", flags: MessageFlags.Ephemeral });
                 return;
            }

            const select = new StringSelectMenuBuilder()
                .setCustomId(`plan:lead:${gameId}`)
                .setPlaceholder("Select Leader")
                .addOptions(
                    aliveLeaders.map(l => 
                        new StringSelectMenuOptionBuilder()
                            .setLabel(`${l.name} (${l.strength})`)
                            .setValue(l.name)
                    )
                );

            await interaction.reply({ 
                content: "Step 1: Select a Leader for the Battle Plan.", 
                components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select)], 
                flags: MessageFlags.Ephemeral 
            });
            // Initialize wizard state? relying on customId chain usually, 
            // but for safety we should maybe init state. 
            // Simpler: Pass decisions in state or just persist in DB? 
            // We can't update DB easily without heavy locking for partial state.
            // Using `wizardState` in GameState is valid.
            state.wizardState[wizardKey] = {}; 
            // We need to SAVE this state change.
             await prisma.game.update({ where: { id: gameId }, data: { stateJson: JSON.stringify(state) } });
            return;
        }

        // 2. Handle Leader Selection -> Ask Weapon
        if (subAction === "lead") {
             if (!interaction.isStringSelectMenu()) return;
             await interaction.deferUpdate();
             const leaderName = interaction.values[0];
             
             // Update State
             state.wizardState[wizardKey] = { ...state.wizardState[wizardKey], leaderName };
             await prisma.game.update({ where: { id: gameId }, data: { stateJson: JSON.stringify(state) } });

             // Ask Weapon
             const weapons = faction.hand.filter(c => c.isWeapon);
             const options = [
                 new StringSelectMenuOptionBuilder().setLabel("None").setValue("None"),
                 ...weapons.map(c => new StringSelectMenuOptionBuilder().setLabel(c.name).setValue(c.name))
             ];

             const select = new StringSelectMenuBuilder()
                .setCustomId(`plan:weap:${gameId}`)
                .setPlaceholder("Select Weapon (Optional)")
                .addOptions(options);

             await interaction.editReply({ 
                 content: `Leader: ${leaderName}\nStep 2: Select a Weapon.`, 
                 components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select)] 
             });
             return;
        }

        // 3. Handle Weapon Selection -> Ask Defense
        if (subAction === "weap") {
            if (!interaction.isStringSelectMenu()) return;
            await interaction.deferUpdate();
            const weaponName = interaction.values[0] === "None" ? undefined : interaction.values[0];

            state.wizardState[wizardKey] = { ...state.wizardState[wizardKey], weaponName };
            await prisma.game.update({ where: { id: gameId }, data: { stateJson: JSON.stringify(state) } });

            // Ask Defense
             const defenses = faction.hand.filter(c => c.isDefense);
             const options = [
                 new StringSelectMenuOptionBuilder().setLabel("None").setValue("None"),
                 ...defenses.map(c => new StringSelectMenuOptionBuilder().setLabel(c.name).setValue(c.name))
             ];

             const select = new StringSelectMenuBuilder()
                .setCustomId(`plan:def:${gameId}`)
                .setPlaceholder("Select Defense (Optional)")
                .addOptions(options);

             await interaction.editReply({ 
                 content: `Leader: ${state.wizardState[wizardKey].leaderName}\nWeapon: ${weaponName || "None"}\nStep 3: Select a Defense.`, 
                 components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select)] 
             });
             return;
        }

        // 4. Handle Defense Selection -> Show Modal for Dial
        if (subAction === "def") {
            if (!interaction.isStringSelectMenu()) return;
            // Can't show Modal in UpdateInteraction easily if deferUpdate was called?
            // "You can only respond to an interaction with a modal if you haven't already replied or deferred."
            // CRITICAL: We did deferUpdate (maybe implicit?) No, we can't chain Select -> Modal directly if we deferred.
            // But here:
            // "weap" handler deferred update.
            // "def" handler: We haven't deferred YET in this block.
            // BUT: "Interaction ... has already been acknowledged" error happens if we reply THEN show modal? No.
            // Select Menu Interaction -> Show Modal is valid.
            // Do NOT deferUpdate here.
            
            const defenseName = interaction.values[0] === "None" ? undefined : interaction.values[0];
            
            // Save state (Need to do it async, but can't defer? DB write is slow.)
            // If we assume success, pass data in CustomId? No space.
            // We MUST save state.
            // If we don't defer, we risk timeout if DB is slow (3s).
            // But we need to Show Modal.
            // Workaround: Add a "Continue" button step?
            // "Defense Selected. Click Continue to enter Dial."
            
            // Update State
            state.wizardState[wizardKey] = { ...state.wizardState[wizardKey], defenseName };
            await prisma.game.update({ where: { id: gameId }, data: { stateJson: JSON.stringify(state) } });
            // This update might be slow. 
            
            // Let's try the Button Intermediate Step approach.
            const btn = new ButtonBuilder()
                .setCustomId(`plan:show-dial:${gameId}`)
                .setLabel("Enter Dial")
                .setStyle(ButtonStyle.Success);
            
            await interaction.update({
                content: `Leader: ${state.wizardState[wizardKey].leaderName}\nWeapon: ${state.wizardState[wizardKey].weaponName || "None"}\nDefense: ${defenseName || "None"}\n\nClick to set Dial.`,
                components: [new ActionRowBuilder<ButtonBuilder>().addComponents(btn)]
            });
            return;
        }

        // 5. Show Dial Modal
        if (subAction === "show-dial") {
             if (!interaction.isButton()) return;
             const modal = new ModalBuilder()
                .setCustomId(`plan:submit:${gameId}`)
                .setTitle("Battle Plan Dial");

            const input = new TextInputBuilder()
                .setCustomId("dial")
                .setLabel("Amount (Forces)")
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setPlaceholder("0");

            modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(input));
            await interaction.showModal(modal);
            return;
        }

        // 6. Submit Plan
        if (subAction === "submit") {
             if (!interaction.isModalSubmit()) return;
             await interaction.deferUpdate();
             
             const dial = parseInt(interaction.fields.getTextInputValue("dial"));
             const planData = state.wizardState[wizardKey];

             if (!planData || !planData.leaderName) {
                 await interaction.followUp({ content: "Session expired data missing.", flags: MessageFlags.Ephemeral });
                 return;
             }

             const plan: BattlePlan = {
                 leaderName: planData.leaderName,
                 weaponName: planData.weaponName,
                 defenseName: planData.defenseName,
                 dial: dial
             };

             try {
                 await gameManager.submitBattlePlan(gameId, interaction.user.id, plan);
                 await interaction.followUp({ content: "Battle Plan Submitted!", flags: MessageFlags.Ephemeral });
                 
                 // Clean up wizard state
                 delete state.wizardState[wizardKey];
                 // Update handled by gameManager call (it reads DB, sees old state, updates it). 
                 // Wait, Race Condition? 
                 // `gameManager.submitBattlePlan` fetches DB again.
                 // So `wizardState` cleanup should happen there or be ignored.
                 // Ideally cleanup.
                 // We can't easily modify state verified by manager without reading again.
                 // Let's just leave it or handle cleanup separate. Garbage collection later?
                 // Or just overwrite next time.
             } catch (e: any) {
                 await interaction.followUp({ content: `Error: ${e.message}`, flags: MessageFlags.Ephemeral });
             }
             return;
        }
    }
}
