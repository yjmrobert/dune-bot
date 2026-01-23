using System.Linq;
using System.Threading.Tasks;
using DuneBot.Domain;
using DuneBot.Domain.Interfaces;
using DuneBot.Domain.State;

namespace DuneBot.Engine.Phases;

public class ShipmentPhaseHandler : IGamePhaseHandler
{
    private readonly IBattleService _battleService;

    public ShipmentPhaseHandler(IBattleService battleService)
    {
        _battleService = battleService;
    }

    public GamePhase Phase => GamePhase.ShipmentAndMovement;

    public Task RunPhaseAsync(Game game)
    {
         var battles = _battleService.DetectBattles(game);
        if (battles.Any())
        {
            foreach (var b in battles) game.State.PendingBattles.Enqueue(b);
            _battleService.StartNextBattle(game);
        }
        return Task.CompletedTask;
    }

    public GamePhase GetNextPhase(Game game)
    {
        var battles = _battleService.DetectBattles(game); // Re-detect or check queue? Queue.
        // If pending battles were added in RunPhaseAsync, we check queue now?
        // Wait, RunPhaseAsync runs *before* we determine NextPhase.
        // So if queue has items, next is Battle.
        if (game.State.PendingBattles.Any()) return GamePhase.Battle;
        return GamePhase.SpiceCollection;
    }

    public string GetPhaseDescription(Game game)
    {
        var shipped = game.State.Factions.Where(f => f.HasShipped).Select(f => f.PlayerName).ToList();
        var moved = game.State.Factions.Where(f => f.HasMoved).Select(f => f.PlayerName).ToList();
        return $"**Shipped:** {(shipped.Any() ? string.Join(", ", shipped) : "None")}\n" +
               $"**Moved:** {(moved.Any() ? string.Join(", ", moved) : "None")}";
    }
}
