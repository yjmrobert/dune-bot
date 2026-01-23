using System.Threading.Tasks;
using DuneBot.Domain;
using DuneBot.Domain.Interfaces;
using DuneBot.Domain.State;

namespace DuneBot.Engine.Phases;

public class SetupPhaseHandler : IGamePhaseHandler
{
    public GamePhase Phase => GamePhase.Setup;

    public Task RunPhaseAsync(Game game)
    {
        // Setup transition logic usually happens via StartGame, but if we call AdvancePhase in Setup,
        // it transitions to Storm.
        // Logic handled in GetNextPhase.
        return Task.CompletedTask;
    }

    public GamePhase GetNextPhase(Game game)
    {
        game.State.Turn = 1;
        return GamePhase.Storm;
    }

    public string GetPhaseDescription(Game game)
    {
        return "Waiting for game to start...";
    }
}
