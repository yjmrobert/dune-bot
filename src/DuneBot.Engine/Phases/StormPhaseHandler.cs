using System.Threading.Tasks;
using DuneBot.Domain;
using DuneBot.Domain.Interfaces;
using DuneBot.Domain.State;

namespace DuneBot.Engine.Phases;

public class StormPhaseHandler : IGamePhaseHandler
{
    private readonly ISpiceService _spiceService;

    public StormPhaseHandler(ISpiceService spiceService)
    {
        _spiceService = spiceService;
    }

    public GamePhase Phase => GamePhase.Storm;

    public Task RunPhaseAsync(Game game)
    {
        // When we run Storm Phase logic (transitioning FROM storm usually triggers next steps)
        // Actually, "AdvancePhase" FROM Storm -> SpiceBlow.
        // It triggers resolving spice blow.
        _spiceService.ResolveSpiceBlow(game);
        return Task.CompletedTask;
    }

    public GamePhase GetNextPhase(Game game)
    {
        return GamePhase.SpiceBlow;
    }

    public string GetPhaseDescription(Game game)
    {
        return $"**Storm Sector:** {game.State.StormLocation}";
    }
}
