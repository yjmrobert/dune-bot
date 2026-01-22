using System;
using System.Linq;
using System.Threading.Tasks;
using Discord;
using Discord.WebSocket;
using DuneBot.Domain.Interfaces;

namespace DuneBot.Host.Services;

public class DiscordService : IDiscordService
{
    private readonly DiscordSocketClient _client;
    // We assume the bot operates in one main guild for now, or we need to pass GuildId. 
    // For prototype, we'll find the Guild from the interaction context or config.
    // But this service is called by GameManager which doesn't know about context.
    // LIMITATION: We need to know WHICH Guild to create channels in.
    // FIX: We will inject a config or assume the first guild checks out.
    // For this step, I'll store the GuildId from the initial interaction or config. 
    // Ideally GameManager should accept a GuildId context. 

    // For now, let's assume we pass the guild ID to the method, or we hardcode it for the single-server use case?
    // User didn't specify multi-server. I'll make GameManager allow passing a "ContextObject" or just update the interface?
    // Updating the interface is best.

    // WAIT, I cannot update the interface EASILY without changing GameManager. 
    // Let's rely on an injected configuration "HomeGuildId" for now to keep it simple.

    public DiscordService(DiscordSocketClient client, Microsoft.Extensions.Configuration.IConfiguration config)
    {
        _client = client;
    }

    public async Task<(ulong CategoryId, ulong ActionsId, ulong MapId, ulong TalkId)> CreateGameChannelsAsync(
        ulong guildId, int gameId, string gameName)
    {
        var guild = _client.GetGuild(guildId);
        if (guild == null) throw new Exception($"Guild {guildId} not found, bot might not be ready.");

        // Create Category with prefix
        string categoryName = $"dg{gameId}-{gameName}";
        var category = await guild.CreateCategoryChannelAsync(categoryName);

        // Create Channels with prefix
        // e.g., dg12-map-updates
        var mapChannel = await guild.CreateTextChannelAsync($"dg{gameId}-map-updates", p => p.CategoryId = category.Id);
        var actionsChannel = await guild.CreateTextChannelAsync($"dg{gameId}-actions", p => p.CategoryId = category.Id);
        var talkChannel = await guild.CreateTextChannelAsync($"dg{gameId}-table-talk", p => p.CategoryId = category.Id);

        // Set Permissions (Example: Map read-only)
        // Todo: Refine permissions later.

        return (category.Id, actionsChannel.Id, mapChannel.Id, talkChannel.Id);
    }

    public async Task DeleteGameChannelsAsync(ulong guildId, ulong categoryId)
    {
        var guild = _client.GetGuild(guildId);
        if (guild == null) return;

        var category = guild.GetCategoryChannel(categoryId);
        if (category != null)
        {
            // Delete children first
            foreach (var channel in category.Channels)
            {
                await channel.DeleteAsync();
            }

            await category.DeleteAsync();
        }
    }

    public async Task SendMapUpdateAsync(ulong guildId, ulong channelId, string content)
    {
        var guild = _client.GetGuild(guildId);
        if (guild == null) return;

        var channel = guild.GetTextChannel(channelId);
        if (channel != null)
        {
            // If the content is a file path, send the file
            if (System.IO.File.Exists(content))
            {
                await channel.SendFileAsync(content, "game_board.png");
            }
            else
            {
                await channel.SendMessageAsync(content);
            }
        }
    }

    public async Task SendActionMessageAsync(ulong guildId, ulong channelId, string message, string buttonLabel,
        string buttonCustomId)
    {
        var guild = _client.GetGuild(guildId);
        if (guild == null)
        {
            Console.WriteLine($"[Error] Guild {guildId} not found in cache.");
            return;
        }

        var channel = guild.GetTextChannel(channelId);
        if (channel == null)
        {
            // Try to get via client directly as fallback
            var c = _client.GetChannel(channelId) as SocketTextChannel;
            if (c != null) channel = c;
            else
            {
                Console.WriteLine($"[Error] Channel {channelId} not found in guild {guild.Name}.");
                return;
            }
        }

        try
        {
            var builder = new ComponentBuilder()
                .WithButton(buttonLabel, buttonCustomId, ButtonStyle.Primary);

            await channel.SendMessageAsync(message, components: builder.Build());
            Console.WriteLine($"[Success] Sent Action Message to {channel.Name}");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[Error] Sending message failed: {ex.Message}");
        }
    }

    public async Task<ulong> CreatePhaseThreadAsync(ulong guildId, ulong channelId, string threadName)
    {
        var guild = _client.GetGuild(guildId);
        if (guild == null) return 0;

        var channel = guild.GetTextChannel(channelId);
        if (channel == null) return 0;

        // AutoArchiveDuration.OneHour = 60
        var thread = await channel.CreateThreadAsync(threadName, autoArchiveDuration: ThreadArchiveDuration.OneHour);
        return thread.Id;
    }

    public async Task ArchiveThreadAsync(ulong guildId, ulong threadId)
    {
        var guild = _client.GetGuild(guildId);
        if (guild == null) return;

        var thread = guild.GetThreadChannel(threadId);
        if (thread != null)
        {
            await thread.ModifyAsync(p => p.Archived = true);
        }
    }

    public async Task SendThreadMessageAsync(ulong guildId, ulong threadId, string content)
    {
        var guild = _client.GetGuild(guildId);
        if (guild == null) return;

        var thread = guild.GetThreadChannel(threadId);
        if (thread != null)
        {
            await thread.SendMessageAsync(content);
        }
    }

    public async Task SendDirectMessageAsync(ulong userId, string content)
    {
        IUser? user = _client.GetUser(userId);
        if (user == null)
        {
            // Try to download if not in cache
            user = await _client.Rest.GetUserAsync(userId);
        }

        if (user != null)
        {
            try
            {
                await user.SendMessageAsync(content);
            }
            catch
            {
                Console.WriteLine($"[Warning] Could not DM user {userId}. Privacy settings?");
            }
        }
    }
}
