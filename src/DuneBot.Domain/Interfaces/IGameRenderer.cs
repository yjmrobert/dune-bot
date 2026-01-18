using System.Threading.Tasks;
using DuneBot.Domain.State;

namespace DuneBot.Domain.Interfaces;

public interface IGameRenderer
{
    // Initial requirement: Output JSON.
    // Future: Output Image URL or File Path.
    // For now we return a string which might be a JSON block.
    string Render(GameState state);
}
