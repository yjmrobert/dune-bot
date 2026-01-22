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

    [SlashCommand("delete-all-games", "DANGER: Deletes ALL active Dune games")]
    public async Task DeleteAllGames()
    {
        // respond ephemerally first
        await RespondAsync("Deleting ALL games...", ephemeral: true);

        int count = await _gameManager.DeleteAllGamesAsync();

        try
        {
            await ModifyOriginalResponseAsync(x => x.Content = $"Deleted {count} games.");
        }
        catch
        {
        }
    }
}
