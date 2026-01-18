using System.Threading.Tasks;
using Discord;
using Discord.Interactions;
using DuneBot.Engine;
using DuneBot.Engine.Services;

namespace DuneBot.Host.Modules;

public class GameModule : InteractionModuleBase<SocketInteractionContext>
{
    private readonly GameManager _gameManager;

    public GameModule(GameManager gameManager)
    {
        _gameManager = gameManager;
    }

    [SlashCommand("create-game", "Creates a new Dune game")]
    public async Task CreateGame(string name = "Dune Game")
    {
        await DeferAsync();
        
        var game = await _gameManager.CreateGameAsync(Context.Guild.Id, name);
        
        await FollowupAsync($"Game Created! ID: {game.Id}, Category: {game.CategoryId}");
    }

    [SlashCommand("delete-game", "Deletes a Dune game")]
    public async Task DeleteGame(int gameId)
    {
        // respond ephemerally first
        await RespondAsync($"Deleting game {gameId}...", ephemeral: true);
        
        await _gameManager.DeleteGameAsync(gameId);
        
        try 
        {
            // Try to update the ephemeral message, but ignore if context is gone
            await ModifyOriginalResponseAsync(x => x.Content = $"Game {gameId} deleted.");
        }
        catch 
        {
            // Channel likely deleted, which is expected behavior
        }
    }
}

public class GameplayModule : InteractionModuleBase<SocketInteractionContext>
{
    private readonly GameEngine _engine;

    public GameplayModule(GameEngine engine)
    {
        _engine = engine;
    }

    [SlashCommand("join", "Join a game")]
    public async Task JoinGame(int gameId)
    {
        await DeferAsync();
        try 
        {
            await _engine.RegisterPlayerAsync(gameId, Context.User.Id, Context.User.Username);
            await FollowupAsync($"Joined game {gameId}!");
        }
        catch (Exception ex)
        {
            await FollowupAsync($"Error: {ex.Message}");
        }
    }

    [SlashCommand("start", "Start the game")]
    public async Task StartGame(int gameId)
    {
        await DeferAsync();
        try
        {
            await _engine.StartGameAsync(gameId);
            await FollowupAsync($"Game {gameId} Started! Good luck.");
        }
        catch (Exception ex)
        {
            await FollowupAsync($"Error: {ex.Message}");
        }
    }

    [SlashCommand("next-phase", "Force advance to next phase")]
    public async Task NextPhase(int gameId)
    {
        await DeferAsync();
        try
        {
            await _engine.AdvancePhaseAsync(gameId);
            await FollowupAsync($"Game {gameId} advanced state.");
        }
        catch (Exception ex)
        {
            await FollowupAsync($"Error: {ex.Message}");
        }
    }

    [ComponentInteraction("next-phase:*")]
    public async Task NextPhaseButton(string gameIdStr)
    {
        await DeferAsync(); // Acknowledge the button to prevent "Interaction Failed"
        if (int.TryParse(gameIdStr, out int gameId))
        {
            try
            {
                await _engine.AdvancePhaseAsync(gameId);
                // We don't need to reply, the bot posts a new message in the channel.
                // But we should probably delete the OLD button to prevent spam clicking?
                // For now, let's just leave it or edit the original message to remove buttons (complex).
                // Simplest for now: User clicks, new message appears at bottom.
            }
            catch (Exception ex)
            {
                await FollowupAsync($"Error: {ex.Message}", ephemeral: true);
            }
        }
    }
}
