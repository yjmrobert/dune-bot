using System.Threading.Tasks;
using DuneBot.Domain;
using DuneBot.Domain.State;

namespace DuneBot.Domain.Interfaces;

public interface ISpiceService
{
    GamePhase ResolveSpiceBlow(Game game);
    void CollectSpice(Game game);
}
