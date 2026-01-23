using System.Threading.Tasks;
using DuneBot.Domain.State;

namespace DuneBot.Domain.Interfaces;

public interface IRevivalService
{
    void StartRevivalPhase(Game game);
    Task ReviveForcesAsync(Game game, ulong userId, int amount);
    Task ReviveLeaderAsync(Game game, ulong userId, string leaderName);
}
