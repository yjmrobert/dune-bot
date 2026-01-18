using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using DuneBot.Domain;
using DuneBot.Domain.Interfaces;
using DuneBot.Domain.State;

namespace DuneBot.Engine;

public class GameEngine
{
    private readonly IGameRepository _repository;
    private readonly IDiscordService _discordService; // For posting updates
    private readonly IGameRenderer _renderer;

    public GameEngine(IGameRepository repository, IDiscordService discordService, IGameRenderer renderer)
    {
        _repository = repository;
        _discordService = discordService;
        _renderer = renderer;
    }

    public async Task RegisterPlayerAsync(int gameId, ulong userId, string username)
    {
        var game = await _repository.GetGameAsync(gameId);
        if (game == null) throw new Exception("Game not found.");
        
        if (game.State.Phase != GamePhase.Setup)
            throw new Exception("Cannot join game in progress.");

        if (game.State.Factions.Any(f => f.PlayerDiscordId == userId))
            throw new Exception("Player already joined.");

        if (game.State.Factions.Count >= 6)
            throw new Exception("Game full.");

        // Add player to a 'pool' or assign empty faction placeholder
        // valid factions: Atreides, Harkonnen, Fremen, etc.
        // We defer assignment to StartGame, so just track participants for now.
        // We'll use FactionState with Faction.None to track joined players.
        game.State.Factions.Add(new FactionState 
        { 
            Faction = Faction.None, 
            PlayerDiscordId = userId,
            PlayerName = username
        });

        game.State.ActionLog.Add($"Player {username} joined the game.");
        await _repository.UpdateGameAsync(game);
    }

    public async Task StartGameAsync(int gameId)
    {
        var game = await _repository.GetGameAsync(gameId);
        if (game == null) throw new Exception("Game not found.");
        
        if (game.State.Phase != GamePhase.Setup)
            throw new Exception("Game already started.");

        if (game.State.Factions.Count < 1) // Allow 1 for testing, normally 2-6
            throw new Exception("Not enough players.");

        // 1. Shuffle Factions
        var availableFactions = Enum.GetValues<Faction>()
            .Where(f => f != Faction.None)
            .OrderBy(x => Guid.NewGuid()) // Random shuffle
            .Take(game.State.Factions.Count)
            .ToList();

        // 2. Assign Factions
        for (int i = 0; i < game.State.Factions.Count; i++)
        {
            var player = game.State.Factions[i];
            player.Faction = availableFactions[i];
            
            // Initial Setup defaults (simplify for now)
            player.Spice = 10;
            player.Reserves = 10;
        }

        // 3. Set Phase
        game.State.Phase = GamePhase.Storm;
        game.State.Turn = 1;
        game.State.ActionLog.Add("Game Started! Factions assigned.");

        await _repository.UpdateGameAsync(game);
        
        await PostGameUpdate(game); 
    }

    public async Task AdvancePhaseAsync(int gameId)
    {
        var game = await _repository.GetGameAsync(gameId);
        if (game == null) throw new Exception("Game not found.");
        
        // Game End Check
        if (game.State.Turn > 10)
        {
            await EndGameAsync(game);
            return;
        }

        var currentPhase = game.State.Phase;
        GamePhase nextPhase;

        // Phase Transition Logic
        switch (currentPhase)
        {
            case GamePhase.Setup:
                nextPhase = GamePhase.Storm;
                game.State.Turn = 1;
                break;
            case GamePhase.MentatPause:
                // End of Round
                if (game.State.Turn >= 10)
                {
                    await EndGameAsync(game);
                    return;
                }
                nextPhase = GamePhase.Storm;
                game.State.Turn++;
                game.State.ActionLog.Add($"--- Round {game.State.Turn} Started ---");
                break;
            default:
                // Linear progression for standard phases
                nextPhase = currentPhase + 1;
                break;
        }

        game.State.Phase = nextPhase;
        game.State.ActionLog.Add($"Phase advanced to {game.State.Phase}.");
        
        await _repository.UpdateGameAsync(game);
        await PostGameUpdate(game);
    }

    private async Task EndGameAsync(Game game)
    {
        // Delete channels
        await _discordService.DeleteGameChannelsAsync(game.GuildId, game.CategoryId);
        // Delete DB
        await _repository.DeleteGameAsync(game.Id);
        // Note: We can't post an update because channels are gone.
    }

    private async Task PostGameUpdate(Game game)
    {
        var content = _renderer.Render(game.State);
        await _discordService.SendMapUpdateAsync(game.GuildId, game.MapChannelId, content);

        // Send Interactive Phase Button
        string message = $"**Round {game.State.Turn}: {game.State.Phase} Phase**\nUse the button below to advance.";
        string btnLabel;
        
        // Determine label based on current phase
        if (game.State.Phase == GamePhase.MentatPause)
        {
            btnLabel = "End Round";
        }
        else
        {
            // Predict next phase for the label
            GamePhase next = (game.State.Phase == GamePhase.Setup) ? GamePhase.Storm : game.State.Phase + 1;
            btnLabel = $"Next Phase: {next}";
        }

        await _discordService.SendActionMessageAsync(game.GuildId, game.ActionsChannelId, message, btnLabel, $"next-phase:{game.Id}");
    }
}
