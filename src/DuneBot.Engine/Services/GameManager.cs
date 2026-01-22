using System;
using System.Threading.Tasks;
using DuneBot.Domain;
using DuneBot.Domain.Interfaces;
using DuneBot.Domain.State;

namespace DuneBot.Engine.Services;

public class GameManager
{
    private readonly IGameRepository _repository;
    private readonly IDiscordService _discordService;

    public GameManager(IGameRepository repository, IDiscordService discordService)
    {
        _repository = repository;
        _discordService = discordService;
    }

    public async Task<Game> CreateGameAsync(ulong guildId, string name)
    {
        // 1. Create Placeholder Game Entity to get an ID
        var game = new Game
        {
            GuildId = guildId,
            State = new GameState() 
        };
        await _repository.CreateGameAsync(game); // This populates game.Id

        try 
        {
            // 2. Create Channels with ID prefix
            var channels = await _discordService.CreateGameChannelsAsync(guildId, game.Id, name);

            // 3. Update Game with Channel IDs
            game.CategoryId = channels.CategoryId;
            game.ActionsChannelId = channels.ActionsId;
            game.MapChannelId = channels.MapId;
            game.TableTalkChannelId = channels.TalkId;
            
            await _repository.UpdateGameAsync(game);
            
            // 4. Send Welcome Message
            var msgId = await _discordService.SendActionMessageAsync(guildId, channels.ActionsId, 
                $"**Dune Game Lobby**\n**Players (0/6):**\n*(Waiting for players...)*\n\nJoin the game and then start when ready.", 
                ("Join Game", $"join-game:{game.Id}", "Success"),
                ("Start Game", $"start-game:{game.Id}", "Success"));

            game.State.LobbyMessageId = msgId;
            await _repository.UpdateGameAsync(game);

            return game;
        }
        catch 
        {
            // Rollback if channel creation fails
            await _repository.DeleteGameAsync(game.Id);
            throw;
        }
    }

    public async Task DeleteGameAsync(int gameId)
    {
        var game = await _repository.GetGameAsync(gameId);
        if (game == null) return;

        // 1. Delete channels
        await _discordService.DeleteGameChannelsAsync(game.GuildId, game.CategoryId);

        // 2. Delete from DB
        await _repository.DeleteGameAsync(gameId);
    }

    public async Task<int> DeleteAllGamesAsync()
    {
        var games = await _repository.GetAllGamesAsync();
        foreach (var game in games)
        {
            await DeleteGameAsync(game.Id);
        }
        return games.Count;
    }
}
