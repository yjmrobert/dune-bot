import { Client, GatewayIntentBits, Events } from "discord.js";
import { config } from "./config";
import { commands } from "./commands";
import { DiscordService } from "./services/DiscordService";
import { GameManager } from "./engine/GameManager";
import { GameEngine } from "./engine/GameEngine";

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// Services
const discordService = new DiscordService(client);
const gameManager = new GameManager(discordService);
const gameEngine = new GameEngine();

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
                await command.execute(interaction, gameEngine);
            } else {
                await command.execute(interaction, gameManager);
            }
        } catch (error) {
            console.error(error);
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
            } else {
                await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
            }
        }
        return;
    }

    // 2. Buttons
    if (interaction.isButton()) {
        const [action, param] = interaction.customId.split(":");
        const gameId = parseInt(param);

        try {
            if (action === "join-game") {
                const result = await gameEngine.registerPlayer(gameId, interaction.user.id, interaction.user.username);
                await interaction.reply({ content: result, ephemeral: true });
            } else if (action === "start-game") {
                await interaction.deferReply({ ephemeral: true });
                await gameEngine.startGame(gameId);
                await interaction.editReply("Game Started!");
            } else if (action === "next-phase") {
                await interaction.deferReply({ ephemeral: true });
                const newState = await gameEngine.advancePhase(gameId);
                await interaction.editReply(`Advanced to phase: ${newState.phase}`);
            }
        } catch (error: any) {
            if (interaction.deferred || interaction.replied) {
                await interaction.followUp({ content: `Error: ${error.message}`, ephemeral: true });
            } else {
                await interaction.reply({ content: `Error: ${error.message}`, ephemeral: true });
            }
        }
    }
});

async function main() {
    await client.login(config.discordToken);
}

main().catch(console.error);
