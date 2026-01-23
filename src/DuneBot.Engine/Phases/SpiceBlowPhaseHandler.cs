using System.Linq;
using System.Threading.Tasks;
using DuneBot.Domain;
using DuneBot.Domain.Interfaces;
using DuneBot.Domain.State;

namespace DuneBot.Engine.Phases;

public class SpiceBlowPhaseHandler : IGamePhaseHandler
{
    private readonly IGameMessageService _messageService;

    public SpiceBlowPhaseHandler(IGameMessageService messageService)
    {
        _messageService = messageService;
    }

    public GamePhase Phase => GamePhase.SpiceBlow;

    public Task RunPhaseAsync(Game game)
    {
        // Logic handled in GetNextPhase determination mostly?
        // Or do we do anything here?
        // Transitioning FROM SpiceBlow -> Choam/Nexus.
        return Task.CompletedTask;
    }

    public GamePhase GetNextPhase(Game game)
    {
        if (game.State.SpiceDiscard.LastOrDefault() == "Shai-Hulud")
        {
             return GamePhase.Nexus;
        }
        return GamePhase.ChoamCharity;
    }

    public string GetPhaseDescription(Game game)
    {
        var lastSpice = game.State.SpiceDiscard.LastOrDefault();
        if (lastSpice == "Shai-Hulud") return _messageService.GetNexusMessage();
        return _messageService.GetSpiceBlowMessage(lastSpice ?? "None", 0).Split('!')[0]; // Simplify
    }
}
