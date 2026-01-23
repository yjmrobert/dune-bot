using System.Threading.Tasks;
using DuneBot.Domain;
using DuneBot.Domain.Interfaces;
using DuneBot.Domain.State;

namespace DuneBot.Engine.Phases;

public class RevivalPhaseHandler : IGamePhaseHandler
{
    private readonly IMovementService _movementService;

    public RevivalPhaseHandler(IMovementService movementService)
    {
        _movementService = movementService;
    }

    public GamePhase Phase => GamePhase.Revival;

    public Task RunPhaseAsync(Game game)
    {
        _movementService.StartShipmentPhase(game);
        return Task.CompletedTask;
    }

    public GamePhase GetNextPhase(Game game)
    {
        return GamePhase.ShipmentAndMovement;
    }

    public string GetPhaseDescription(Game game)
    {
        return "Revive up to 3 forces (2 spice each). Fremen free.";
    }
}
