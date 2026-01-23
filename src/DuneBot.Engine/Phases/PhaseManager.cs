using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using DuneBot.Domain;
using DuneBot.Domain.Interfaces;
using DuneBot.Domain.State;

namespace DuneBot.Engine.Phases;

public class PhaseManager : IPhaseManager
{
    private readonly IEnumerable<IGamePhaseHandler> _handlers;
    private readonly IGameRepository _repository;
    private readonly IGameRenderer _renderer;
    private readonly IDiscordService _discordService;

    public PhaseManager(IEnumerable<IGamePhaseHandler> handlers, IGameRepository repository, 
        IGameRenderer renderer, IDiscordService discordService)
    {
        _handlers = handlers;
        _repository = repository;
        _renderer = renderer;
        _discordService = discordService;
    }

    public async Task AdvancePhaseAsync(Game game)
    {
        // 1. Get Handler for Current Phase
        var handler = _handlers.First(h => h.Phase == game.State.Phase);

        // 2. Determine Next Phase
        var nextPhase = handler.GetNextPhase(game);

        // 3. Update Phase
        game.State.Phase = nextPhase;
        
        // 4. Run Logic for NEW Phase (e.g. if we switched to Storm, storm happens immediately?)
        // Wait, original logic: 
        // Case Storm: ResolveSpiceBlow -> Next = SpiceBlow.
        // So "Storm" logic happened *before* switch? No.
        // Original: "switch(currentPhase) { case Setup: next = Storm... }"
        // Then it sets phase = next.
        // Then it posts update.
        // BUT, some logic happened inside the case block (e.g. resolve spice blow).
        // So "RunPhaseAsync" should run logic for the *Current* phase before transitioning?
        // Let's check my handlers.
        // StormHandler: RunPhase -> ResolveSpiceBlow. NextPhase -> SpiceBlow.
        // So yes, we run current handler's logic first.

        await handler.RunPhaseAsync(game);

        
        if (game.State.Phase == GamePhase.Ended)
        {
             // Game Over - cleanup
             await _discordService.DeleteGameChannelsAsync(game.GuildId, game.CategoryId);
             await _repository.DeleteGameAsync(game.Id);
             return;
        }

        // Update DB
        await _repository.UpdateGameAsync(game);

        // Post Update
        await PostGameUpdate(game);
    }

    public string GetCurrentPhaseInfo(Game game)
    {
        var handler = _handlers.FirstOrDefault(h => h.Phase == game.State.Phase);
        return handler?.GetPhaseDescription(game) ?? "Unknown Phase";
    }

    private async Task PostGameUpdate(Game game)
    {
        var content = _renderer.Render(game.State);
        await _discordService.SendMapUpdateAsync(game.GuildId, game.MapChannelId, content);

        string message = $"**Round {game.State.Turn}: {game.State.Phase} Phase**\nUse the button below to advance.";
        string btnLabel;

        if (game.State.Phase == GamePhase.MentatPause)
        {
            btnLabel = "End Round";
        }
        else
        {
            var handler = _handlers.First(h => h.Phase == game.State.Phase);
            var next = handler.GetNextPhase(game); // Prediction for label
            btnLabel = $"Next Phase: {next}";
        }

        message += "\n\n**Phase Information:**\n" + GetCurrentPhaseInfo(game);

        await _discordService.SendActionMessageAsync(game.GuildId, game.ActionsChannelId, message, 
            (btnLabel, $"next-phase:{game.Id}", "Primary"));
    }
}
