using System;
using System.Linq;
using System.Threading.Tasks;
using DuneBot.Domain;
using DuneBot.Domain.Interfaces;
using DuneBot.Domain.State;

namespace DuneBot.Engine.Phases;

public class MentatPausePhaseHandler : IGamePhaseHandler
{
    private readonly IMapService _mapService;
    private readonly IBattleService _battleService;
    private readonly IGameMessageService _messageService;

    public MentatPausePhaseHandler(IMapService mapService, IBattleService battleService, IGameMessageService messageService)
    {
        _mapService = mapService;
        _battleService = battleService;
        _messageService = messageService;
    }

    public GamePhase Phase => GamePhase.MentatPause;

    public Task RunPhaseAsync(Game game)
    {
        // Storm Logic for Next Round
        int move = new Random().Next(1, 7); // d6
        int oldSector = game.State.StormLocation;
        int newSector = _mapService.CalculateNextStormSector(oldSector, move);
        game.State.StormLocation = newSector;

        // Storm Damage
        _battleService.ApplyStormDamage(game, oldSector, move);

        // Win Condition Check (Basic 3 Strongholds)
        var strongholds = game.State.Map.Territories.Where(t => t.IsStronghold).ToList();
        var factionCounts = new System.Collections.Generic.Dictionary<Faction, int>();

        foreach (var s in strongholds)
        {
             // Control = Sole Occupancy
             if (s.FactionForces.Count == 1)
             {
                 var occupier = s.FactionForces.Keys.First();
                 // Exclude Bene Gesserit logic for now (assumed standard)
                 if (!factionCounts.ContainsKey(occupier)) factionCounts[occupier] = 0;
                 factionCounts[occupier]++;
             }
        }

        if (factionCounts.Any(kv => kv.Value >= 3))
        {
            var winner = factionCounts.First(kv => kv.Value >= 3).Key;
            var winnerName = game.State.Factions.FirstOrDefault(f => f.Faction == winner)?.PlayerName ?? winner.ToString();
            
            game.State.Phase = GamePhase.Ended;
            game.State.ActionLog.Add($"*** GAME OVER! {winnerName} controls 3 Strongholds and WINS! ***");
            return Task.CompletedTask;
        }

        game.State.Turn++;
        
        if (game.State.Turn > 10)
        {
            game.State.Phase = GamePhase.Ended;
            game.State.ActionLog.Add("Game Over! Turn limit reached.");
            return Task.CompletedTask;
        }

        game.State.ActionLog.Add($"--- Round {game.State.Turn} Started ---");
        game.State.ActionLog.Add(_messageService.GetStormMessage(move, oldSector, newSector));
        
        return Task.CompletedTask;
    }

    public GamePhase GetNextPhase(Game game)
    {
        return GamePhase.Storm;
    }

    public string GetPhaseDescription(Game game)
    {
        var recentLogs = game.State.ActionLog.TakeLast(3).ToList();
        if (recentLogs.Any())
            return string.Join("\n", recentLogs);
        return "End of Round processing.";
    }
}
