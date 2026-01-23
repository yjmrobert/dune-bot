using System;
using System.Threading.Tasks;
using DuneBot.Domain.Interfaces;
using DuneBot.Domain.State;

namespace DuneBot.Engine;

public class GameEngine
{
    private readonly IGameRepository _repository;
    private readonly IBattleService _battleService;
    private readonly IBiddingService _biddingService;
    private readonly IMovementService _movementService;
    private readonly IRevivalService _revivalService;
    private readonly IGameSetupService _setupService;
    private readonly IPhaseManager _phaseManager;

    public GameEngine(IGameRepository repository, IBattleService battleService,
        IBiddingService biddingService, IMovementService movementService, IRevivalService revivalService,
        IGameSetupService setupService, IPhaseManager phaseManager)
    {
        _repository = repository;
        _battleService = battleService;
        _biddingService = biddingService;
        _movementService = movementService;
        _revivalService = revivalService;
        _setupService = setupService;
        _phaseManager = phaseManager;
    }

    // --- Setup & Workflow ---

    public async Task RegisterPlayerAsync(int gameId, ulong userId, string username)
    {
        await _setupService.RegisterPlayerAsync(gameId, userId, username);
    }

    public async Task StartGameAsync(int gameId)
    {
        await _setupService.StartGameAsync(gameId);
    }

    public async Task AdvancePhaseAsync(int gameId)
    {
        var game = await _repository.GetGameAsync(gameId);
        if (game == null) throw new Exception("Game not found.");

        await _phaseManager.AdvancePhaseAsync(game);
    }

    // --- Action Methods (Delegated) ---

    public async Task PlaceBidAsync(int gameId, ulong userId, int amount)
    {
        var game = await _repository.GetGameAsync(gameId);
        if (game == null) throw new Exception("Game not found.");
        await _biddingService.PlaceBidAsync(game, userId, amount);
    }

    public async Task PassBidAsync(int gameId, ulong userId)
    {
        var game = await _repository.GetGameAsync(gameId);
        if (game == null) throw new Exception("Game not found.");
        await _biddingService.PassBidAsync(game, userId);
    }

    public async Task ReviveForcesAsync(int gameId, ulong userId, int amount)
    {
        var game = await _repository.GetGameAsync(gameId);
        if (game == null) throw new Exception("Game not found.");
        await _revivalService.ReviveForcesAsync(game, userId, amount);
    }

    public async Task ReviveLeaderAsync(int gameId, ulong userId, string leaderName)
    {
        var game = await _repository.GetGameAsync(gameId);
        if (game == null) throw new Exception("Game not found.");
        await _revivalService.ReviveLeaderAsync(game, userId, leaderName);
    }

    public async Task ShipForcesAsync(int gameId, ulong userId, string toTerritoryName, int amount)
    {
        var game = await _repository.GetGameAsync(gameId);
        if (game == null) throw new Exception("Game not found.");
        await _movementService.ShipForcesAsync(game, userId, toTerritoryName, amount);
    }

    public async Task MoveForcesAsync(int gameId, ulong userId, string fromTerritoryName, string toTerritoryName,
        int amount)
    {
        var game = await _repository.GetGameAsync(gameId);
        if (game == null) throw new Exception("Game not found.");
        await _movementService.MoveForcesAsync(game, userId, fromTerritoryName, toTerritoryName, amount);
    }

    public async Task SubmitBattlePlanAsync(int gameId, ulong userId, string leader, int dial, string? weapon,
        string? defense)
    {
        var game = await _repository.GetGameAsync(gameId);
        if (game == null) throw new Exception("Game not found.");
        await _battleService.SubmitBattlePlanAsync(game, userId, leader, dial, weapon, defense);
    }

    public async Task UseVoiceAsync(int gameId, ulong userId, ulong targetId, string type, bool mustPlay)
    {
        var game = await _repository.GetGameAsync(gameId);
        if (game == null) throw new Exception("Game not found.");
        await _battleService.UseVoiceAsync(game, userId, targetId, type, mustPlay);
    }

    public async Task UsePrescienceAsync(int gameId, ulong userId, string type)
    {
        var game = await _repository.GetGameAsync(gameId);
        if (game == null) throw new Exception("Game not found.");
        await _battleService.UsePrescienceAsync(game, userId, type);
    }
}
