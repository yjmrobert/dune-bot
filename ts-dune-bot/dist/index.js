"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const config_1 = require("./config");
const commands_1 = require("./commands");
const DiscordService_1 = require("./services/DiscordService");
const GameManager_1 = require("./engine/GameManager");
const GameEngine_1 = require("./engine/GameEngine");
const client = new discord_js_1.Client({
    intents: [
        discord_js_1.GatewayIntentBits.Guilds,
        discord_js_1.GatewayIntentBits.GuildMessages,
        discord_js_1.GatewayIntentBits.MessageContent
    ]
});
// Services
const discordService = new DiscordService_1.DiscordService(client);
const gameManager = new GameManager_1.GameManager(discordService);
const gameEngine = new GameEngine_1.GameEngine();
client.once(discord_js_1.Events.ClientReady, async (c) => {
    console.log(`Ready! Logged in as ${c.user.tag}`);
    // Auto-deploy commands
    try {
        console.log("Deploying commands...");
        const commandsData = Object.values(commands_1.commands).map(cmd => cmd.data.toJSON());
        await c.application.commands.set(commandsData);
        console.log(`Successfully deployed ${commandsData.length} commands.`);
    }
    catch (error) {
        console.error("Failed to deploy commands:", error);
    }
});
client.on(discord_js_1.Events.InteractionCreate, async (interaction) => {
    // 1. Slash Commands
    if (interaction.isChatInputCommand()) {
        const command = commands_1.commands[interaction.commandName];
        if (!command) {
            console.error(`No command matching ${interaction.commandName} was found.`);
            return;
        }
        try {
            // Check if command needs gameEngine (hacky check for now, ideally strictly typed)
            if (["join-game", "start-game", "next-phase"].includes(interaction.commandName)) {
                // @ts-ignore
                await command.execute(interaction, gameEngine);
            }
            else {
                // @ts-ignore
                await command.execute(interaction, gameManager);
            }
        }
        catch (error) {
            console.error(error);
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
            }
            else {
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
            }
            else if (action === "start-game") {
                await interaction.deferReply({ ephemeral: true });
                await gameEngine.startGame(gameId);
                await interaction.editReply("Game Started!");
            }
            else if (action === "next-phase") {
                await interaction.deferReply({ ephemeral: true });
                const newState = await gameEngine.advancePhase(gameId);
                await interaction.editReply(`Advanced to phase: ${newState.phase}`);
            }
        }
        catch (error) {
            if (interaction.deferred || interaction.replied) {
                await interaction.followUp({ content: `Error: ${error.message}`, ephemeral: true });
            }
            else {
                await interaction.reply({ content: `Error: ${error.message}`, ephemeral: true });
            }
        }
    }
});
async function main() {
    await client.login(config_1.config.discordToken);
}
main().catch(console.error);
