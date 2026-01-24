using System;
using System.Threading.Tasks;
using DuneBot.Domain;
using DuneBot.Domain.Interfaces;
using DuneBot.Domain.State;

namespace DuneBot.Engine.Phases;

public class StormPhaseHandler : IGamePhaseHandler
{
    private readonly ISpiceService _spiceService;
    private readonly IBattleService _battleService;
    private readonly IMapService _mapService;

    public StormPhaseHandler(ISpiceService spiceService, IBattleService battleService, IMapService mapService)
    {
        _spiceService = spiceService;
        _battleService = battleService;
        _mapService = mapService;
    }

    public GamePhase Phase => GamePhase.Storm;

    public Task RunPhaseAsync(Game game)
    {
        // 1. Determine Storm Movement
        int moveAmount;
        if (game.State.Turn == 1)
        {
            // First Storm: Random 0-18 (User Request)
            moveAmount = Random.Shared.Next(0, 19); 
        }
        else
        {
            // Subsequent Storms: Random 1-10 (User Request)
            moveAmount = Random.Shared.Next(1, 11);
        }

        // 2. Move Storm
        int oldSector = game.State.StormLocation;
        int newSector = _mapService.CalculateNextStormSector(oldSector, moveAmount);
        game.State.StormLocation = newSector;
        
        game.State.ActionLog.Add($"**Storm** moved {moveAmount} sectors to **Sector {newSector}** (from {oldSector}).");

        // 3. Apply Damage (Forces & Spice)
        _battleService.ApplyStormDamage(game, oldSector, moveAmount);

        // 4. Update First Player
        UpdateFirstPlayer(game);

        // 5. Trigger next phase setup (Spice Blow)
        _spiceService.ResolveSpiceBlow(game);
        return Task.CompletedTask;
    }

    public void UpdateFirstPlayer(Game game)
    {
        // The First Player is the one whose Storm Start Sector is "next approached" by the storm.
        // Storm moves counter-clockwise (18 -> 1). 
        // We look for the first player whose StartSector is <= StormLocation?
        // Wait, "approaches". If storm moves 1 -> 2 -> 3.
        // It "approaches" 4, 5, 6... 
        
        var stormLoc = game.State.StormLocation;
        
        FactionState? firstPlayer = null;
        int minDistance = 999;
        
        foreach (var faction in game.State.Factions)
        {
            int dist = faction.StartSector - stormLoc;
            if (dist <= 0) dist += 18; // Wrap around
            
            if (dist < minDistance)
            {
                minDistance = dist;
                firstPlayer = faction;
            }
        }
        
        if (firstPlayer != null)
        {
             game.State.FirstPlayerId = firstPlayer.PlayerDiscordId;
             game.State.ActionLog.Add($"**First Player** is now **{firstPlayer.PlayerName}**.");
        }
    }

    public GamePhase GetNextPhase(Game game)
    {
        return GamePhase.SpiceBlow;
    }

    public string GetPhaseDescription(Game game)
    {
        return $"**Storm Sector:** {game.State.StormLocation}";
    }
}
