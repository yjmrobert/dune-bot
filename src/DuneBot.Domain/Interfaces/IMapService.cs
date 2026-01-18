using DuneBot.Domain.State;

namespace DuneBot.Domain.Interfaces;

public interface IMapService
{
    MapState InitializeMap();
    int CalculateNextStormSector(int currentSector, int moveAmount);
}
