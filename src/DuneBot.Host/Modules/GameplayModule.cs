using System;
using System.Threading.Tasks;
using Discord;
using Discord.Interactions;
using DuneBot.Engine;
using DuneBot.Engine.Services;

namespace DuneBot.Host.Modules;

public class GameplayModule : InteractionModuleBase<SocketInteractionContext>
{
    private readonly GameEngine _engine;

    public GameplayModule(GameEngine engine)
    {
        _engine = engine;
    }

    private int? GetGameIdFromContext()
    {
        // Try channel name first (e.g. "dg5-actions")
        var channelMatch = System.Text.RegularExpressions.Regex.Match(Context.Channel.Name, @"^dg(\d+)-");
        if (channelMatch.Success && int.TryParse(channelMatch.Groups[1].Value, out int channelId))
        {
            return channelId;
        }

        // Try category name if applicable
        if (Context.Channel is Discord.WebSocket.SocketTextChannel textChannel && textChannel.Category != null)
        {
            var catMatch = System.Text.RegularExpressions.Regex.Match(textChannel.Category.Name, @"^dg(\d+)-");
            if (catMatch.Success && int.TryParse(catMatch.Groups[1].Value, out int catId))
            {
                return catId;
            }
        }

        return null;
    }

    [SlashCommand("start", "Start the game")]
    public async Task StartGame(int? gameId = null)
    {
        await DeferAsync();
        try
        {
            int? resolvedId = gameId ?? GetGameIdFromContext();
            if (resolvedId == null) throw new Exception("Could not determine Game ID. Please specify it explicitly.");

            await _engine.StartGameAsync(resolvedId.Value);
            await FollowupAsync($"Game {resolvedId.Value} Started! Good luck.");
        }
        catch (Exception ex)
        {
            await FollowupAsync($"Error: {ex.Message}");
        }
    }

    [SlashCommand("join", "Join a game")]
    public async Task JoinGame(int? gameId = null, IUser? user = null)
    {
        await DeferAsync();
        try
        {
            int? resolvedId = gameId ?? GetGameIdFromContext();
            if (resolvedId == null) throw new Exception("Could not determine Game ID. Please specify it explicitly.");

            var targetUser = user ?? Context.User;
            await _engine.RegisterPlayerAsync(resolvedId.Value, targetUser.Id, targetUser.Username);
            await FollowupAsync($"{targetUser.Mention} joined game {resolvedId.Value}!");
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

    [ComponentInteraction("join-game:*")]
    public async Task JoinGameButton(string gameIdStr)
    {
        await DeferAsync(ephemeral: true);
        if (int.TryParse(gameIdStr, out int gameId))
        {
            try
            {
                await _engine.RegisterPlayerAsync(gameId, Context.User.Id, Context.User.Username);
                await FollowupAsync("You have successfully joined the game!", ephemeral: true);
            }
            catch (Exception ex)
            {
                await FollowupAsync($"Failed to join: {ex.Message}", ephemeral: true);
            }
        }
    }

    [ComponentInteraction("start-game:*")]
    public async Task StartGameButton(string gameIdStr)
    {
        await DeferAsync(); 
        if (int.TryParse(gameIdStr, out int gameId))
        {
            try
            {
                await _engine.StartGameAsync(gameId);
            }
            catch (Exception ex)
            {
                await FollowupAsync($"Failed to start: {ex.Message}", ephemeral: true);
            }
        }
    }
}
