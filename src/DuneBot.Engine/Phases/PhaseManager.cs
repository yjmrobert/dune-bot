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
        var handler = _handlers.First(h => h.Phase == game.State.Phase);
        var nextPhase = handler.GetNextPhase(game);
        game.State.Phase = nextPhase;
        
        // Find new handler
        handler = _handlers.First(h => h.Phase == game.State.Phase);
        await handler.RunPhaseAsync(game);

        if (game.State.Phase == GamePhase.Ended)
        {
             await _discordService.DeleteGameChannelsAsync(game.GuildId, game.CategoryId);
             await _repository.DeleteGameAsync(game.Id);
             return;
        }

        await _repository.UpdateGameAsync(game);
        await PostGameUpdate(game);
    }

    public async Task ForceGameUpdateAsync(Game game)
    {
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
        var lastLog = game.State.ActionLog.LastOrDefault();
        await _discordService.SendMapUpdateAsync(game.GuildId, game.MapChannelId, content, lastLog);

        string message = $"**Round {game.State.Turn}: {game.State.Phase} Phase**\nUse the button below to advance.";
        string btnLabel;

        if (game.State.Phase == GamePhase.MentatPause)
        {
            btnLabel = "End Round";
        }
        else
        {
            var handler = _handlers.First(h => h.Phase == game.State.Phase);
            var next = handler.GetNextPhase(game); 
            btnLabel = $"Next Phase: {next}";
        }

        message += "\n\n**Phase Information:**\n" + GetCurrentPhaseInfo(game);

        var buttons = new List<(string Label, string CustomId, string Style)>();
        if (game.State.Phase == GamePhase.ChoamCharity)
        {
            buttons.Add(("Claim Charity", $"claim-charity:{game.Id}", "Success"));
        }
        buttons.Add((btnLabel, $"next-phase:{game.Id}", "Primary"));

        await _discordService.SendActionMessageAsync(game.GuildId, game.ActionsChannelId, message, buttons.ToArray());
    }
}
