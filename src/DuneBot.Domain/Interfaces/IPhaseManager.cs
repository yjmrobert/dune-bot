using System.Threading.Tasks;
using DuneBot.Domain;
using DuneBot.Domain.State;

namespace DuneBot.Domain.Interfaces;

public interface IPhaseManager
{
    Task AdvancePhaseAsync(Game game);
    string GetCurrentPhaseInfo(Game game);
}
