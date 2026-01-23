using System.Threading.Tasks;
using DuneBot.Domain;
using DuneBot.Domain.Interfaces;
using DuneBot.Domain.State;

namespace DuneBot.Engine.Phases;

public class SpiceCollectionPhaseHandler : IGamePhaseHandler
{
    private readonly ISpiceService _spiceService;

    public SpiceCollectionPhaseHandler(ISpiceService spiceService)
    {
        _spiceService = spiceService;
    }

    public GamePhase Phase => GamePhase.SpiceCollection;

    public Task RunPhaseAsync(Game game)
    {
        _spiceService.CollectSpice(game);
        return Task.CompletedTask;
    }

    public GamePhase GetNextPhase(Game game)
    {
        return GamePhase.MentatPause;
    }

    public string GetPhaseDescription(Game game)
    {
        return "Harvests take place automatically.";
    }
}
