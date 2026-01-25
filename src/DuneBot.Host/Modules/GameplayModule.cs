using System;
using System.Threading.Tasks;
using Discord.Interactions;
using DuneBot.Engine;
using Microsoft.Extensions.Logging;

namespace DuneBot.Host.Modules;

public class GameplayModule : InteractionModuleBase<SocketInteractionContext>
{
    private readonly GameEngine _gameEngine;
    private readonly ILogger<GameplayModule> _logger;

    public GameplayModule(GameEngine gameEngine, ILogger<GameplayModule> logger)
    {
        _gameEngine = gameEngine;
        _logger = logger;
    }

    [ComponentInteraction("join-game:*")]
    public async Task JoinGame(string gameIdStr)
    {
        if (!int.TryParse(gameIdStr, out int gameId))
        {
            await RespondAsync("Invalid game ID.", ephemeral: true);
            return;
        }

        try
        {
            await _gameEngine.RegisterPlayerAsync(gameId, Context.User.Id, Context.User.Username);
            
            // We can just defer here since the message update happens in the service
            await DeferAsync();
        }
        catch (Exception ex)
        {
            await RespondAsync($"Error joining game: {ex.Message}", ephemeral: true);
        }
    }

    [ComponentInteraction("start-game:*")]
    public async Task StartGame(string gameIdStr)
    {
        if (!int.TryParse(gameIdStr, out int gameId))
        {
            await RespondAsync("Invalid game ID.", ephemeral: true);
            return;
        }

        try
        {
            // Defer first to give time for processing
            await DeferAsync();
            await _gameEngine.StartGameAsync(gameId);
        }
        catch (Exception ex)
        {
            await FollowupAsync($"Error starting game: {ex.Message}", ephemeral: true);
        }
    }

    [ComponentInteraction("next-phase:*")]
    public async Task NextPhase(string gameIdStr)
    {
        if (!int.TryParse(gameIdStr, out int gameId))
        {
            await RespondAsync("Invalid game ID.", ephemeral: true);
            return;
        }

        try
        {
            await DeferAsync();
            await _gameEngine.AdvancePhaseAsync(gameId);
        }
        catch (Exception ex)
        {
            await FollowupAsync($"Error advancing phase: {ex.Message}", ephemeral: true);
        }
    }
}
