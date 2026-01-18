using System.Threading.Tasks;

namespace DuneBot.Domain.Interfaces;

public interface IGameRepository
{
    Task<Game?> GetGameAsync(int gameId);
    Task<List<Game>> GetAllGamesAsync();
    Task<Game> CreateGameAsync(Game game);
    Task UpdateGameAsync(Game game);
    Task DeleteGameAsync(int gameId);
}
