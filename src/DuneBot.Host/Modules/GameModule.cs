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
        catch { }
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

    [SlashCommand("bid", "Bid spice for the card")]
    public async Task Bid(int gameId, int amount)
    {
        await DeferAsync();
        try 
        {
            await _engine.PlaceBidAsync(gameId, Context.User.Id, amount);
            await FollowupAsync($"Bid placed.", ephemeral: true);
        }
        catch (Exception ex)
        {
            await FollowupAsync($"Error: {ex.Message}");
        }
    }

    [SlashCommand("revive-forces", "Revive forces from Tanks")]
    public async Task ReviveForces(int gameId, int amount)
    {
        await DeferAsync();
        try 
        {
            await _engine.ReviveForcesAsync(gameId, Context.User.Id, amount);
            await FollowupAsync($"Revived {amount} forces.", ephemeral: true);
        }
        catch (Exception ex)
        {
            await FollowupAsync($"Error: {ex.Message}");
        }
    }

    [SlashCommand("revive-leader", "Revive a leader from Tanks")]
    public async Task ReviveLeader(int gameId, string leaderName)
    {
        await DeferAsync();
        try 
        {
            await _engine.ReviveLeaderAsync(gameId, Context.User.Id, leaderName);
            await FollowupAsync($"Revived {leaderName}.", ephemeral: true);
        }
        catch (Exception ex)
        {
            await FollowupAsync($"Error: {ex.Message}");
        }
    }

    [SlashCommand("pass", "Pass bidding")]
    public async Task Pass(int gameId)
    {
        await DeferAsync();
        try 
        {
            await _engine.PassBidAsync(gameId, Context.User.Id);
            await FollowupAsync($"Passed.", ephemeral: true);
        }
        catch (Exception ex)
        {
            await FollowupAsync($"Error: {ex.Message}");
        }
    }

    [SlashCommand("ship", "Ship forces to a territory")]
    public async Task Ship(int gameId, string territory, int amount)
    {
        await DeferAsync();
        try 
        {
            await _engine.ShipForcesAsync(gameId, Context.User.Id, territory, amount);
            await FollowupAsync($"Shipped {amount} to {territory}.", ephemeral: true);
        }
        catch (Exception ex)
        {
            await FollowupAsync($"Error: {ex.Message}");
        }
    }

    [SlashCommand("move", "Move forces between territories")]
    public async Task Move(int gameId, string from, string to, int amount)
    {
        await DeferAsync();
        try 
        {
            await _engine.MoveForcesAsync(gameId, Context.User.Id, from, to, amount);
            await FollowupAsync($"Moved {amount} from {from} to {to}.", ephemeral: true);
        }
        catch (Exception ex)
        {
            await FollowupAsync($"Error: {ex.Message}");
        }
    }

    [SlashCommand("battle-commit", "Commit battle plan")]
    public async Task BattleCommit(int gameId, string leader, int dial, string? weapon = null, string? defense = null)
    {
        await DeferAsync(ephemeral: true); // Must be secret!
        try 
        {
            await _engine.SubmitBattlePlanAsync(gameId, Context.User.Id, leader, dial, weapon, defense);
            await FollowupAsync($"Plan committed: {leader}, {dial} forces.", ephemeral: true);
        }
        catch (Exception ex)
        {
            await FollowupAsync($"Error: {ex.Message}", ephemeral: true);
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
    [ComponentInteraction("dummy_button")]
    public async Task DummyButtonHandler()
    {
        // Just defer to prevent "Interaction Failed"
        await DeferAsync(ephemeral: true);
        await FollowupAsync("Waiting for other players to join and the host to start the game...", ephemeral: true);
    }
}
