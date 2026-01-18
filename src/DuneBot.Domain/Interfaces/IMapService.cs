using DuneBot.Domain.State;

namespace DuneBot.Domain.Interfaces;

public interface IMapService
{
    MapState InitializeMap();
    int CalculateNextStormSector(int currentSector, int moveAmount);
    bool AreTerritoriesAdjacent(string territory1, string territory2);
    bool IsReachable(string start, string end, int maxMoves);
}
