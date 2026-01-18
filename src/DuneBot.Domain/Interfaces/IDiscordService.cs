using System.Threading.Tasks;

namespace DuneBot.Domain.Interfaces;

public interface IDiscordService
{
    // Returns (CategoryId, ActionChannelId, MapChannelId, TableTalkChannelId)
    Task<(ulong CategoryId, ulong ActionsId, ulong MapId, ulong TalkId)> CreateGameChannelsAsync(ulong guildId, string gameName);
    Task DeleteGameChannelsAsync(ulong guildId, ulong categoryId);
    Task SendMapUpdateAsync(ulong guildId, ulong channelId, string content);
    Task SendActionMessageAsync(ulong guildId, ulong channelId, string message, string buttonLabel, string buttonCustomId);
}
