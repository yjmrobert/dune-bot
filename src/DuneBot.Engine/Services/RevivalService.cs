using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using DuneBot.Domain;
using DuneBot.Domain.Interfaces;
using DuneBot.Domain.State;

namespace DuneBot.Engine.Services;

public class RevivalService : IRevivalService
{
    private readonly IGameRepository _repository;
    private readonly IGameMessageService _messageService;

    public RevivalService(IGameRepository repository, IGameMessageService messageService)
    {
        _repository = repository;
        _messageService = messageService;
    }

    public void StartRevivalPhase(Game game)
    {
        foreach (var f in game.State.Factions)
        {
            f.RevivedTroopsThisTurn = 0;
        }

        game.State.ActionLog.Add("Revival Phase: Revive up to 3 forces and 1 leader.");
    }

    public async Task ReviveForcesAsync(Game game, ulong userId, int amount)
    {
        if (game.State.Phase != GamePhase.Revival) throw new Exception("Not in Revival phase.");

        var faction = game.State.Factions.First(f => f.PlayerDiscordId == userId);

        if (amount <= 0) throw new Exception("Amount must be positive.");
        if (faction.ForcesInTanks < amount)
            throw new Exception($"Not enough forces in Tanks. You have {faction.ForcesInTanks}.");

        int limit = 3;
        if (faction.RevivedTroopsThisTurn + amount > limit)
            throw new Exception(
                $"Revival limit exceeded. You can revive {limit - faction.RevivedTroopsThisTurn} more.");

        int costPerForce = (faction.Faction == Faction.Fremen) ? 0 : 2;
        int totalCost = amount * costPerForce;

        if (faction.Spice < totalCost)
            throw new Exception($"Not enough spice. Cost: {totalCost}. You have {faction.Spice}.");

        faction.Spice -= totalCost;
        faction.ForcesInTanks -= amount;
        faction.Reserves += amount;
        faction.RevivedTroopsThisTurn += amount;

        game.State.ActionLog.Add(_messageService.GetRevivalMessage(faction.PlayerName, amount));
        await _repository.UpdateGameAsync(game);
    }

    public async Task ReviveLeaderAsync(Game game, ulong userId, string leaderName)
    {
        if (game.State.Phase != GamePhase.Revival) throw new Exception("Not in Revival phase.");

        var faction = game.State.Factions.First(f => f.PlayerDiscordId == userId);

        if (!faction.DeadLeaders.Contains(leaderName))
            throw new Exception("Leader not in Tanks.");

        int cost = 2; // Simplified cost

        if (faction.Spice < cost) throw new Exception($"Not enough spice. Cost: {cost}.");

        faction.Spice -= cost;
        faction.DeadLeaders.Remove(leaderName);
        
        game.State.ActionLog.Add(_messageService.GetReviveLeaderMessage(faction.PlayerName, leaderName));
        await _repository.UpdateGameAsync(game);
    }
}
