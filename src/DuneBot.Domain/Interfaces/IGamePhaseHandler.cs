using System.Threading.Tasks;
using DuneBot.Domain;
using DuneBot.Domain.State;

namespace DuneBot.Domain.Interfaces;

public interface IGamePhaseHandler
{
    GamePhase Phase { get; }
    Task RunPhaseAsync(Game game);
    GamePhase GetNextPhase(Game game);
    string GetPhaseDescription(Game game); // For the embed/message
}
