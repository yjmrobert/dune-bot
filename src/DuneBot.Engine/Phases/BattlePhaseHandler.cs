using System;
using System.Linq;
using System.Threading.Tasks;
using DuneBot.Domain;
using DuneBot.Domain.Interfaces;
using DuneBot.Domain.State;

namespace DuneBot.Engine.Phases;

public class BattlePhaseHandler : IGamePhaseHandler
{
    private readonly IBattleService _battleService;

    public BattlePhaseHandler(IBattleService battleService)
    {
        _battleService = battleService;
    }

    public GamePhase Phase => GamePhase.Battle;

    public Task RunPhaseAsync(Game game)
    {
        // Advance logic: if battles remain, start next.
        if (game.State.PendingBattles.Count > 0 ||
            (game.State.CurrentBattle != null && game.State.CurrentBattle.IsActive))
        {
            if (game.State.CurrentBattle != null && game.State.CurrentBattle.IsActive)
                throw new Exception("Battle in progress. Resolve it first.");

            if (game.State.PendingBattles.Count > 0)
            {
                _battleService.StartNextBattle(game);
            }
        }
        return Task.CompletedTask;
    }

    public GamePhase GetNextPhase(Game game)
    {
        if (game.State.CurrentBattle != null && game.State.CurrentBattle.IsActive)
            return GamePhase.Battle; // Should not happen if called via "Next Phase" button which implies completed

        if (game.State.PendingBattles.Count > 0)
            return GamePhase.Battle;

        return GamePhase.SpiceCollection;
    }

    public string GetPhaseDescription(Game game)
    {
        var state = game.State;
         if (state.CurrentBattle != null && state.CurrentBattle.IsActive)
        {
            var f1 = state.Factions.FirstOrDefault(f => f.PlayerDiscordId == state.CurrentBattle.Faction1Id);
            var f2 = state.Factions.FirstOrDefault(f => f.PlayerDiscordId == state.CurrentBattle.Faction2Id);
            return $"**Active Battle:** {state.CurrentBattle.TerritoryName}\n" +
                   $"**Combatants:** {f1?.PlayerName} vs {f2?.PlayerName}\n" +
                   $"*Waiting for Battle Plans...*";
        }
        return "No active battle.";
    }
}
