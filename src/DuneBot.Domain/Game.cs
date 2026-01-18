using DuneBot.Domain.State;

namespace DuneBot.Domain;

public class Game
{
    public int Id { get; set; }
    public ulong GuildId { get; set; }
    
    // Discord Integration IDs
    public ulong CategoryId { get; set; }
    public ulong ActionsChannelId { get; set; }
    public ulong MapChannelId { get; set; }
    public ulong TableTalkChannelId { get; set; }
    
    // Serialized State
    // We will serialize/deserialize this to JSON for storage
    public string StateJson { get; set; } = "{}";

    // Helper to get typed state (Not mapped to DB)
    public GameState State { get; set; }
}
