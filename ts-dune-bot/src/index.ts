import { Client, GatewayIntentBits, Events, MessageFlags, ActionRowBuilder, StringSelectMenuBuilder } from "discord.js";
import { config } from "./config";
import { commands } from "./commands";
import { DiscordService } from "./services/DiscordService";
import { GameManager } from "./engine/GameManager";
import { GameEngine } from "./engine/GameEngine";
import { ensureDatabaseInitialized } from "./utils/dbInit";
import { MapService } from "./services/MapService";
import { renderGame } from "./domain/gamePresenter";

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// Services
const discordService = new DiscordService(client);
const gameEngine = new GameEngine();
const gameManager = new GameManager(discordService, gameEngine);

// Command Dispatcher
import { InteractionDispatcher } from "./commands/interactions/InteractionDispatcher";
import { JoinGameCommand } from "./commands/interactions/JoinGameCommand";
import { StartGameCommand } from "./commands/interactions/StartGameCommand";
import { NextPhaseCommand } from "./commands/interactions/NextPhaseCommand";
import { WizardCommand } from "./commands/interactions/WizardCommand";
import { PlayerInfoCommand } from "./commands/interactions/PlayerInfoCommand";

const dispatcher = new InteractionDispatcher(gameManager);
dispatcher.register("join-game", new JoinGameCommand());
dispatcher.register("start-game", new StartGameCommand());
dispatcher.register("next-phase", new NextPhaseCommand());
dispatcher.register("wizard", new WizardCommand());
dispatcher.register("player-actions", new PlayerInfoCommand());
// TODO: Register other commands as they are migrated
// dispatcher.register("move-storm", new MoveStormCommand());
// dispatcher.register("spice-blow", new SpiceBlowCommand());
// dispatcher.register("player-actions", new PlayerActionsCommand());
// dispatcher.register("wizard", new WizardCommand());

client.once(Events.ClientReady, async c => {
    console.log(`Ready! Logged in as ${c.user.tag}`);

    // Auto-deploy commands
    try {
        console.log("Deploying commands...");
        const commandsData = Object.values(commands).map(cmd => cmd.data.toJSON());
        await c.application.commands.set(commandsData);
        console.log(`Successfully deployed ${commandsData.length} commands.`);
    } catch (error) {
        console.error("Failed to deploy commands:", error);
    }
});

client.on(Events.InteractionCreate, async (interaction) => {
    // 1. Slash Commands
    if (interaction.isChatInputCommand()) {
        const command = commands[interaction.commandName];
        if (!command) {
            console.error(`No command matching ${interaction.commandName} was found.`);
            return;
        }

        try {
            // Check if command needs gameEngine (hacky check for now, ideally strictly typed)
            if (["join-game", "start-game", "next-phase"].includes(interaction.commandName)) {
                // @ts-ignore
                await command.execute(interaction, gameManager);
            } else {
                // @ts-ignore
                await command.execute(interaction, gameManager);
            }
        } catch (error: any) {
            console.error(error);
            // Ignore Unknown Interaction (10062) and Already Acknowledged (40060)
            if (error.code === 10062 || error.code === 40060) {
                return;
            }

            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: 'There was an error while executing this command!', flags: MessageFlags.Ephemeral }).catch(e => console.error("Failed to follow up error:", e));
            } else {
                await interaction.reply({ content: 'There was an error while executing this command!', flags: MessageFlags.Ephemeral }).catch(e => console.error("Failed to reply error:", e));
            }
        }
        return;
    }

    // 2. Buttons & Select Menus (Handled by Dispatcher)
    if (interaction.isButton() || interaction.isStringSelectMenu()) {
        await dispatcher.dispatch(interaction);
    }
});

async function main() {
    await ensureDatabaseInitialized();
    await client.login(config.discordToken);
}

main().catch(console.error);

