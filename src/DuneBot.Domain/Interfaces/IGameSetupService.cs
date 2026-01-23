using System.Threading.Tasks;

namespace DuneBot.Domain.Interfaces;

public interface IGameSetupService
{
    Task RegisterPlayerAsync(int gameId, ulong userId, string username);
    Task StartGameAsync(int gameId);
}
