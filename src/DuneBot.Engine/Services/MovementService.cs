using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using DuneBot.Domain;
using DuneBot.Domain.Interfaces;
using DuneBot.Domain.State;

namespace DuneBot.Engine.Services;

public class MovementService : IMovementService
{
    private readonly IGameRepository _repository;
    private readonly IMapService _mapService;
    private readonly IGameMessageService _messageService;

    public MovementService(IGameRepository repository, IMapService mapService, IGameMessageService messageService)
    {
        _repository = repository;
        _mapService = mapService;
        _messageService = messageService;
    }

    public void StartShipmentPhase(Game game)
    {
        foreach (var f in game.State.Factions)
        {
            f.HasShipped = false;
            f.HasMoved = false;
        }

        game.State.ActionLog.Add("Shipment & Movement Phase Started.");
    }

    public async Task ShipForcesAsync(Game game, ulong userId, string toTerritoryName, int amount)
    {
        if (game.State.Phase != GamePhase.ShipmentAndMovement) throw new Exception("Not in Shipment/Movement phase.");

        var faction = game.State.Factions.First(f => f.PlayerDiscordId == userId);
        if (faction.HasShipped) throw new Exception("You have already shipped this turn.");

        var territory = game.State.Map.Territories.FirstOrDefault(t => t.Name == toTerritoryName);
        if (territory == null) throw new Exception("Territory not found.");
        if (territory.Sector == game.State.StormLocation) throw new Exception("Cannot ship into Storm.");

        if (amount <= 0) throw new Exception("Amount must be positive.");
        if (faction.Reserves < amount) throw new Exception($"Not enough reserves. You have {faction.Reserves}.");

        int costPerForce = territory.IsStronghold ? 1 : 2;
        int totalCost = amount * costPerForce;

        if (faction.Faction == Faction.Guild)
        {
            totalCost = (int)Math.Ceiling(totalCost / 2.0);
        }

        if (faction.Spice < totalCost)
            throw new Exception($"Not enough spice. Cost: {totalCost}. You have {faction.Spice}.");

        faction.Spice -= totalCost;
        faction.Reserves -= amount;

        if (faction.Faction != Faction.Guild)
        {
            var guild = game.State.Factions.FirstOrDefault(f => f.Faction == Faction.Guild);
            if (guild != null)
            {
                guild.Spice += totalCost;
                game.State.ActionLog.Add($"**{guild.PlayerName}** (Guild) received shipment payment.");
            }
        }

        if (!territory.FactionForces.ContainsKey(faction.Faction))
            territory.FactionForces[faction.Faction] = 0;

        territory.FactionForces[faction.Faction] += amount;

        faction.HasShipped = true;
        game.State.ActionLog.Add(
            $"**{faction.PlayerName}** shipped {amount} forces to **{toTerritoryName}** for {totalCost} spice.");

        await _repository.UpdateGameAsync(game);
    }

    public async Task MoveForcesAsync(Game game, ulong userId, string fromTerritoryName, string toTerritoryName, int amount)
    {
        if (game.State.Phase != GamePhase.ShipmentAndMovement) throw new Exception("Not in Shipment/Movement phase.");

        var faction = game.State.Factions.First(f => f.PlayerDiscordId == userId);
        if (faction.HasMoved) throw new Exception("You have already moved this turn.");

        if (amount <= 0) throw new Exception("Amount must be positive.");

        var fromT = game.State.Map.Territories.FirstOrDefault(t => t.Name == fromTerritoryName);
        var toT = game.State.Map.Territories.FirstOrDefault(t => t.Name == toTerritoryName);

        if (fromT == null || toT == null) throw new Exception("Invalid territory.");

        if (!fromT.FactionForces.ContainsKey(faction.Faction) || fromT.FactionForces[faction.Faction] < amount)
            throw new Exception($"Not enough forces in {fromTerritoryName}.");

        if (fromT.Sector == game.State.StormLocation || toT.Sector == game.State.StormLocation)
            throw new Exception("Cannot move through Storm.");

        bool hasOrnithopters = game.State.Map.Territories
            .Any(t => (t.Name == "Arrakeen" || t.Name == "Carthag") &&
                      t.FactionForces.ContainsKey(faction.Faction) &&
                      t.FactionForces[faction.Faction] > 0);

        int maxMoves = hasOrnithopters ? 3 : 1;

        if (faction.Faction == Faction.Fremen)
        {
            maxMoves = Math.Max(maxMoves, 2);
        }

        if (!_mapService.IsReachable(fromTerritoryName, toTerritoryName, maxMoves))
            throw new Exception($"Destination unreachable (Max moves: {maxMoves}).");

        fromT.FactionForces[faction.Faction] -= amount;
        if (fromT.FactionForces[faction.Faction] == 0) fromT.FactionForces.Remove(faction.Faction);

        if (!toT.FactionForces.ContainsKey(faction.Faction))
            toT.FactionForces[faction.Faction] = 0;
        toT.FactionForces[faction.Faction] += amount;

        faction.HasMoved = true;
        game.State.ActionLog.Add(_messageService.GetMovementMessage(faction.PlayerName, amount, fromTerritoryName, toTerritoryName));

        await _repository.UpdateGameAsync(game);
    }
}
