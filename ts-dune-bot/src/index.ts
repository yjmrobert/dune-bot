import { Client, GatewayIntentBits, Events, MessageFlags } from "discord.js";
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
// Services
const discordService = new DiscordService(client);
const gameEngine = new GameEngine();
const gameManager = new GameManager(discordService, gameEngine);

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

    // 2. Buttons
    if (interaction.isButton()) {
        const [action, param] = interaction.customId.split(":");
        const gameId = parseInt(param);

        try {
            if (action === "join-game") {
                const { result, state, game } = await gameManager.registerPlayer(gameId, interaction.user.id, interaction.user.username);
                await interaction.reply({ content: result, flags: MessageFlags.Ephemeral });

                // Update Lobby Message
                if (game.actionsChannelId && state.lobbyMessageId) {
                    const factions = state.factions.map(f => `• ${f.playerName} (${f.faction})`).join("\n");
                    const lobbyContent = `**Dune Game Lobby**\n**Players (${state.factions.length}/6):**\n${factions || "*(Waiting for players...)*"}\n\nJoin the game and then start when ready.`;
                    await discordService.editMessage(game.guildId, game.actionsChannelId, state.lobbyMessageId, lobbyContent);
                }
            } else if (action === "start-game") {
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                const { state, game } = await gameManager.startGame(gameId);
                await interaction.editReply("Game Started! Check the action channel.");

                if (game.actionsChannelId) {
                    if (game.actionsChannelId) {
                        await discordService.sendGameView(
                            game.guildId,
                            game.actionsChannelId,
                            renderGame(state, gameManager.getAvailableActions(state), game.id)
                        );

                        // Trigger Map Update
                        await MapService.updateMap(game, state, discordService);
                    }
                }
            } else if (action === "next-phase") {
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                const newState = await gameManager.advancePhase(gameId);
                await interaction.editReply(`Advanced to phase: ${newState.phase}`);

                // Update View
                const game = await gameManager.getGame(gameId);
                if (game && game.actionsChannelId) {
                    await discordService.sendGameView(
                        game.guildId,
                        game.actionsChannelId,
                        renderGame(newState as any, gameManager.getAvailableActions(newState), game.id)
                    );
                }
            }
        } catch (error: any) {
            console.error(error);
            if (error.code === 10062 || error.code === 40060) {
                return;
            }

            if (interaction.deferred || interaction.replied) {
                await interaction.followUp({ content: `Error: ${error.message}`, flags: MessageFlags.Ephemeral }).catch(e => console.error("Failed to follow up error:", e));
            } else {
                await interaction.reply({ content: `Error: ${error.message}`, flags: MessageFlags.Ephemeral }).catch(e => console.error("Failed to reply error:", e));
            }
        }
    }
});

async function main() {
    await ensureDatabaseInitialized();
    await client.login(config.discordToken);
}

main().catch(console.error);
