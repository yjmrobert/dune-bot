using System.Text.Json;
using DuneBot.Data;
using DuneBot.Domain;
using DuneBot.Domain.Interfaces;
using DuneBot.Domain.State;
using Microsoft.EntityFrameworkCore;

namespace DuneBot.Data.Repositories;

public class GameRepository : IGameRepository
{
    private readonly DuneDbContext _context;

    public GameRepository(DuneDbContext context)
    {
        _context = context;
    }

    public async Task<Game?> GetGameAsync(int gameId)
    {
        var game = await _context.Games.FindAsync(gameId);
        if (game != null)
        {
            // Deserialize state
            if (!string.IsNullOrEmpty(game.StateJson))
            {
                game.State = JsonSerializer.Deserialize<GameState>(game.StateJson) ?? new GameState();
            }
            else
            {
                game.State = new GameState();
            }
        }
        return game;
    }

    public async Task<Game> CreateGameAsync(Game game)
    {
        // Ensure state is serialized
        game.StateJson = JsonSerializer.Serialize(game.State ?? new GameState());
        
        _context.Games.Add(game);
        await _context.SaveChangesAsync();
        return game;
    }

    public async Task UpdateGameAsync(Game game)
    {
        // Update serialization
        game.StateJson = JsonSerializer.Serialize(game.State);
        
        _context.Entry(game).State = EntityState.Modified;
        await _context.SaveChangesAsync();
    }

    public async Task DeleteGameAsync(int gameId)
    {
        var game = await _context.Games.FindAsync(gameId);
        if (game != null)
        {
            _context.Games.Remove(game);
            await _context.SaveChangesAsync();
        }
    }
}
