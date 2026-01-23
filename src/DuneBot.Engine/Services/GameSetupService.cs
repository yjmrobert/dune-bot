using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using DuneBot.Domain;
using DuneBot.Domain.Interfaces;
using DuneBot.Domain.State;

namespace DuneBot.Engine.Services;

public class GameSetupService : IGameSetupService
{
    private readonly IGameRepository _repository;
    private readonly IDiscordService _discordService;
    private readonly IMapService _mapService;
    private readonly IDeckService _deckService;
    private readonly IGameMessageService _messageService;
    private readonly IGameRenderer _renderer;

    public GameSetupService(IGameRepository repository, IDiscordService discordService, IMapService mapService,
        IDeckService deckService, IGameMessageService messageService, IGameRenderer renderer)
    {
        _repository = repository;
        _discordService = discordService;
        _mapService = mapService;
        _deckService = deckService;
        _messageService = messageService;
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

        // Assign Random Faction
        var takenFactions = game.State.Factions.Select(f => f.Faction).ToList();
        var allFactions = Enum.GetValues<Faction>().Where(f => f != Faction.None).ToList();
        var availableFactions = allFactions.Except(takenFactions).ToList();
        
        if (!availableFactions.Any()) throw new Exception("No factions available.");
        
        var randomFaction = availableFactions[new Random().Next(availableFactions.Count)];

        game.State.Factions.Add(new FactionState
        {
            Faction = randomFaction,
            PlayerDiscordId = userId,
            PlayerName = username
        });

        game.State.ActionLog.Add($"Player {username} joined as {randomFaction}.");
        await _repository.UpdateGameAsync(game);
        
        // Update Lobby Message
        if (game.State.LobbyMessageId.HasValue)
        {
            var msg = _messageService.GetLobbyMessage(game);
            await _discordService.ModifyMessageAsync(game.GuildId, game.ActionsChannelId, game.State.LobbyMessageId.Value, msg);
        }
    }

    public async Task StartGameAsync(int gameId)
    {
        var game = await _repository.GetGameAsync(gameId);
        if (game == null) throw new Exception("Game not found.");

        if (game.State.Phase != GamePhase.Setup)
            throw new Exception("Game already started.");

        if (game.State.Factions.Count < 1) 
            throw new Exception("Not enough players.");

        // Factions are already assigned on join
        foreach (var faction in game.State.Factions)
        {
            // Initial Setup defaults (simplify for now)
            faction.Spice = 10;
            faction.Reserves = 10;
        }

        // 3. Initialize Map & Storm
        game.State.Map = _mapService.InitializeMap();
        var rnd = new Random();
        int randomShift = rnd.Next(0, 19); // 0 to 18
        int stormStart = 1 + randomShift;
        if (stormStart > 18) stormStart -= 18;
        game.State.StormLocation = stormStart;

        // 4. Initialize Decks
        game.State.TreacheryDeck = _deckService.GetTreacheryDeck();
        _deckService.Shuffle(game.State.TreacheryDeck);

        game.State.SpiceDeck = _deckService.GetSpiceDeck();
        _deckService.Shuffle(game.State.SpiceDeck);

        game.State.TraitorDeck = _deckService.GetTraitorDeck();
        _deckService.Shuffle(game.State.TraitorDeck);

        // 5. Deal Traitors
        foreach (var faction in game.State.Factions)
        {
            // Harkonnen keeps 4, others keep 1 (MVP: Draw target amount directly)
            int count = (faction.Faction == Faction.Harkonnen) ? 4 : 1;

            for (int k = 0; k < count; k++)
            {
                var card = _deckService.Draw(game.State.TraitorDeck, new List<string>()); // No discard for setup
                if (card != null) faction.Traitors.Add(card);
            }
        }

        // 6. Set Phase
        game.State.Phase = GamePhase.Storm;
        game.State.Turn = 1;
        game.State.ActionLog.Add($"Game Started! Storm is at Sector {game.State.StormLocation}.");

        await _repository.UpdateGameAsync(game);

        // Trigger first update via Renderer/DiscordService or let GameEngine Drive it?
        // Plan: GameSetupService just updates state. GameEngine/PhaseManager handles posting update.
        // Wait, StartGameAsync was triggering PostGameUpdate.
        // I should probably let PhaseManager trigger the update if the phase changed.
        // But StartGameAsync is unique.
        // Let's manually trigger update here or expose method?
        // Or inject PhaseManager here to trigger "Advance" logic? No, circular dependency.
        // I will replicate PostGameUpdate logic here locally or return something indicating update needed.
        // For now, I'll copy the PostGameUpdate minimal logic or inject dependencies to do it.
        
        var content = _renderer.Render(game.State);
        await _discordService.SendMapUpdateAsync(game.GuildId, game.MapChannelId, content);

        // Send Interactive Phase Button
        string message = $"**Round {game.State.Turn}: {game.State.Phase} Phase**\nUse the button below to advance.";
        string btnLabel = "Next Phase: Storm"; // Known next
        
        // Add Phase Information
        message += "\n\n**Phase Information:**\n" + $"**Storm Sector:** {game.State.StormLocation}"; // Hardcoded for setup->storm transition
        
        await _discordService.SendActionMessageAsync(game.GuildId, game.ActionsChannelId, message, 
            (btnLabel, $"next-phase:{game.Id}", "Primary"));
    }
}
