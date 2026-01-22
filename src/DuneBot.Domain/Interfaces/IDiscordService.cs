using System.Threading.Tasks;

namespace DuneBot.Domain.Interfaces;

public interface IDiscordService
{
    // Returns (CategoryId, ActionChannelId, MapChannelId, TableTalkChannelId)
    Task<(ulong CategoryId, ulong ActionsId, ulong MapId, ulong TalkId)> CreateGameChannelsAsync(ulong guildId, int gameId, string gameName);
    Task DeleteGameChannelsAsync(ulong guildId, ulong categoryId);
    Task SendMapUpdateAsync(ulong guildId, ulong channelId, string content);
    Task<ulong> SendActionMessageAsync(ulong guildId, ulong channelId, string message, params (string Label, string CustomId, string Style)[] buttons);
    Task ModifyMessageAsync(ulong guildId, ulong channelId, ulong messageId, string newContent);
    Task<ulong> CreatePhaseThreadAsync(ulong guildId, ulong channelId, string threadName);
    Task ArchiveThreadAsync(ulong guildId, ulong threadId);
    Task SendThreadMessageAsync(ulong guildId, ulong threadId, string content);
    Task SendDirectMessageAsync(ulong userId, string content);
}
