using System.Threading.Tasks;

namespace DuneBot.Domain.Interfaces;

public interface IDiscordService
{
    // Returns (CategoryId, ActionChannelId, MapChannelId, TableTalkChannelId)
    Task<(ulong CategoryId, ulong ActionsId, ulong MapId, ulong TalkId)> CreateGameChannelsAsync(ulong guildId, int gameId, string gameName);
    Task DeleteGameChannelsAsync(ulong guildId, ulong categoryId);
    Task SendMapUpdateAsync(ulong guildId, ulong channelId, string content);
    Task SendActionMessageAsync(ulong guildId, ulong channelId, string message, string buttonLabel, string buttonCustomId);
    Task<ulong> CreatePhaseThreadAsync(ulong guildId, ulong channelId, string threadName);
    Task ArchiveThreadAsync(ulong guildId, ulong threadId);
    Task SendThreadMessageAsync(ulong guildId, ulong threadId, string content);
}
