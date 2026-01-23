using System.Threading.Tasks;
using DuneBot.Domain.State;

namespace DuneBot.Domain.Interfaces;

public interface IMovementService
{
    void StartShipmentPhase(Game game);
    Task ShipForcesAsync(Game game, ulong userId, string toTerritoryName, int amount);
    Task MoveForcesAsync(Game game, ulong userId, string fromTerritoryName, string toTerritoryName, int amount);
}
