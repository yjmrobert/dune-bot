using System.Threading.Tasks;
using DuneBot.Domain;
using DuneBot.Domain.Interfaces;
using DuneBot.Domain.State;

namespace DuneBot.Engine.Phases;

public class NexusPhaseHandler : IGamePhaseHandler
{
    private readonly IGameMessageService _messageService;

    public NexusPhaseHandler(IGameMessageService messageService)
    {
        _messageService = messageService;
    }

    public GamePhase Phase => GamePhase.Nexus;

    public Task RunPhaseAsync(Game game)
    {
        // Nexus implementation is minimal for now.
        return Task.CompletedTask;
    }

    public GamePhase GetNextPhase(Game game)
    {
        return GamePhase.ChoamCharity; // Resume loop
    }

    public string GetPhaseDescription(Game game)
    {
        return _messageService.GetNexusMessage();
    }
}
