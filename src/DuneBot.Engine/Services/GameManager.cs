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
        // 1. Create Channels via Discord Service
        var channels = await _discordService.CreateGameChannelsAsync(guildId, name);

        // 2. Create Game Entity
        var game = new Game
        {
            GuildId = guildId,
            CategoryId = channels.CategoryId,
            ActionsChannelId = channels.ActionsId,
            MapChannelId = channels.MapId,
            TableTalkChannelId = channels.TalkId,
            State = new GameState() // Initial empty state
        };

        // 3. Persist
        await _repository.CreateGameAsync(game);
        
        // 4. Send Welcome Message
        await _discordService.SendActionMessageAsync(guildId, channels.ActionsId, 
            "**New Game Lobby Open!**\nJoin the game with `/join` and then `/start`.", 
            "Wait for Start", 
            "dummy_button"); // Dummy button or just text? Interface requires button. Let's use a "Refresh" or plain button.
        
        return game;
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
}
