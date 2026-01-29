import { Client, GatewayIntentBits, Events } from "discord.js";
import { config } from "./config";
import { commands } from "./commands";
import { DiscordService } from "./services/DiscordService";
import { GameManager } from "./engine/GameManager";

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
            await command.execute(interaction, gameManager);
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

    // 2. Buttons (Placeholder for now)
    if (interaction.isButton()) {
        console.log(`Button clicked: ${interaction.customId}`);
        // TODO: Delegate to a Button Handler / Interaction Service
    }
});

async function main() {
    await client.login(config.discordToken);
}

main().catch(console.error);
