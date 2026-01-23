using System.Collections.Generic;
using System.Threading.Tasks;
using DuneBot.Domain.State;

namespace DuneBot.Domain.Interfaces;

public interface IBattleService
{
    List<BattleState> DetectBattles(Game game);
    void StartNextBattle(Game game);
    Task SubmitBattlePlanAsync(Game game, ulong userId, string leader, int dial, string? weapon, string? defense);
    Task UseVoiceAsync(Game game, ulong userId, ulong targetId, string type, bool mustPlay);
    Task UsePrescienceAsync(Game game, ulong userId, string type);
    // ResolveBattle is internal logic usually, but if exposed via interface, it might be void and triggered internally by SubmitBattlePlan
    // Or we keep it internal to the service if the service handles the full flow.
    // Since GameEngine calls it, let's keep it here or handle it implicitly. 
    // Plan: GameEngine delegates "SubmitPlan" to Service, Service checks if both committed, and then runs ResolveBattle internally.
    // So ResolveBattle doesn't need to be in interface if GameEngine just calls SubmitPlan.
    
    // Storm damage logic was also proposed here
    void ApplyStormDamage(Game game, int startSector, int moveAmount);
}
