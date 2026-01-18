using System.Text.Json;
using DuneBot.Domain.Interfaces;
using DuneBot.Domain.State;

namespace DuneBot.Renderer;

public class JsonGameRenderer : IGameRenderer
{
    private static readonly JsonSerializerOptions _options = new() 
    { 
        WriteIndented = true,
        Converters = { new System.Text.Json.Serialization.JsonStringEnumConverter() }
    };

    public string Render(GameState state)
    {
        var json = JsonSerializer.Serialize(state, _options);
        return $"```json\n{json}\n```";
    }
}
