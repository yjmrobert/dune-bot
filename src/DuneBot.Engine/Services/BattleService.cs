using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using DuneBot.Domain;
using DuneBot.Domain.Interfaces;
using DuneBot.Domain.State;

namespace DuneBot.Engine.Services;

public class BattleService : IBattleService
{
    private readonly IDiscordService _discordService;
    private readonly IGameRepository _repository;
    private readonly IGameMessageService _messageService;

    public BattleService(IDiscordService discordService, IGameRepository repository, IGameMessageService messageService)
    {
        _discordService = discordService;
        _repository = repository;
        _messageService = messageService;
    }

    public List<BattleState> DetectBattles(Game game)
    {
        var battles = new List<BattleState>();
        foreach (var t in game.State.Map.Territories)
        {
            if (t.FactionForces.Count >= 2)
            {
                var keys = t.FactionForces.Keys.ToList();
                var f1 = game.State.Factions.First(f => f.Faction == keys[0]);
                var f2 = game.State.Factions.First(f => f.Faction == keys[1]);

                battles.Add(new BattleState
                {
                    TerritoryName = t.Name,
                    Faction1Id = f1.PlayerDiscordId ?? 0,
                    Faction2Id = f2.PlayerDiscordId ?? 0,
                    IsActive = false
                });
            }
        }
        return battles;
    }

    public void StartNextBattle(Game game)
    {
        if (game.State.PendingBattles.Count == 0) return;

        var battle = game.State.PendingBattles.Dequeue();
        battle.IsActive = true;
        game.State.CurrentBattle = battle;

        var f1 = game.State.Factions.First(f => f.PlayerDiscordId == battle.Faction1Id);
        var f2 = game.State.Factions.First(f => f.PlayerDiscordId == battle.Faction2Id);

        game.State.ActionLog.Add(_messageService.GetBattleMessage(battle.TerritoryName, f1.PlayerName, f2.PlayerName));
        game.State.ActionLog.Add("Submit battle plans with `/battle commit`.");
    }

    public async Task SubmitBattlePlanAsync(Game game, ulong userId, string leader, int dial, string? weapon, string? defense)
    {
        if (game.State.Phase != GamePhase.Battle) throw new Exception("Not in Battle phase.");
        if (game.State.CurrentBattle == null || !game.State.CurrentBattle.IsActive)
            throw new Exception("No active battle.");

        var battle = game.State.CurrentBattle;
        if (userId != battle.Faction1Id && userId != battle.Faction2Id)
            throw new Exception("You are not in this battle.");

        var faction = game.State.Factions.First(f => f.PlayerDiscordId == userId);

        if (faction.DeadLeaders.Contains(leader)) throw new Exception("Leader is dead.");

        if (game.State.Factions.Any(f => f.CapturedLeaders.Contains(leader)))
            throw new Exception("Leader is captured!");

        var territory = game.State.Map.Territories.First(t => t.Name == battle.TerritoryName);
        if (!territory.FactionForces.ContainsKey(faction.Faction))
            throw new Exception("You have no forces there?"); 
        int maxForces = territory.FactionForces[faction.Faction];
        if (dial < 0 || dial > maxForces) throw new Exception($"Invalid dial. Max {maxForces}.");

        if (!string.IsNullOrEmpty(weapon) && !faction.TreacheryCards.Contains(weapon))
            throw new Exception($"You don't have {weapon}.");
        if (!string.IsNullOrEmpty(defense) && !faction.TreacheryCards.Contains(defense))
            throw new Exception($"You don't have {defense}.");

        if (!battle.Plans.ContainsKey(userId)) battle.Plans[userId] = new BattlePlan();

        battle.Plans[userId] = new BattlePlan
        {
            LeaderName = leader,
            Dial = dial,
            Weapon = weapon,
            Defense = defense
        };

        ValidateVoice(battle, userId, battle.Plans[userId], faction);

        if (battle.PrescienceRequest.HasValue && battle.PrescienceRequest.Value.RequesterId != userId)
        {
            await RevealPrescienceInfo(game, battle, userId);
        }

        game.State.ActionLog.Add($"**{faction.PlayerName}** committed battle plan.");

        if (battle.Plans.Count == 2)
        {
            game.State.ActionLog.Add("Both plans committed! Resolving...");
            ResolveBattle(game, battle);
        }

        await _repository.UpdateGameAsync(game);
    }

    public async Task UseVoiceAsync(Game game, ulong userId, ulong targetId, string type, bool mustPlay)
    {
        if (game.State.Phase != GamePhase.Battle) throw new Exception("Not in Battle phase.");
        if (game.State.CurrentBattle == null || !game.State.CurrentBattle.IsActive)
            throw new Exception("No active battle.");

        var battle = game.State.CurrentBattle;

        var userFaction = game.State.Factions.First(f => f.PlayerDiscordId == userId);
        if (userFaction.Faction != Faction.BeneGesserit) throw new Exception("Only Bene Gesserit can use Voice.");

        if (targetId != battle.Faction1Id && targetId != battle.Faction2Id)
            throw new Exception("Target not in battle.");

        if (battle.VoiceRestriction.HasValue) throw new Exception("Voice already used this battle.");

        if (string.IsNullOrEmpty(type)) throw new Exception("Voice type cannot be empty.");

        battle.VoiceRestriction = (targetId, type, mustPlay);

        string command = mustPlay ? "MUST play" : "Must NOT play";
        var targetFaction = game.State.Factions.First(f => f.PlayerDiscordId == targetId);

        game.State.ActionLog.Add(
            $"**{userFaction.PlayerName}** uses Voice on **{targetFaction.PlayerName}**: {command} a {type}.");
        await _repository.UpdateGameAsync(game);
    }

    public async Task UsePrescienceAsync(Game game, ulong userId, string type)
    {
        if (game.State.Phase != GamePhase.Battle) throw new Exception("Not in Battle phase.");
        var battle = game.State.CurrentBattle;
        if (battle == null || !battle.IsActive) throw new Exception("No active battle.");

        var userFaction = game.State.Factions.First(f => f.PlayerDiscordId == userId);
        if (userFaction.Faction != Faction.Atreides) throw new Exception("Only Atreides can use Prescience.");

        if (battle.PrescienceRequest.HasValue) throw new Exception("Prescience already used this battle.");

        if (type != "Leader" && type != "Weapon" && type != "Defense" && type != "Dial")
            throw new Exception("Invalid Prescience type. Choose: Leader, Weapon, Defense, Dial.");

        battle.PrescienceRequest = (userId, type);
        game.State.ActionLog.Add(
            $"**{userFaction.PlayerName}** uses Prescience. They will see the opponent's **{type}**.");

        var opponentId = (battle.Faction1Id == userId) ? battle.Faction2Id : battle.Faction1Id;
        if (battle.Plans.ContainsKey(opponentId))
        {
            await RevealPrescienceInfo(game, battle, opponentId);
        }

        await _repository.UpdateGameAsync(game);
    }

    public void ApplyStormDamage(Game game, int startSector, int moveAmount)
    {
        var sectorsHit = new List<int>();
        for (int i = 1; i <= moveAmount; i++)
        {
            int s = startSector + i;
            if (s > 18) s -= 18;
            sectorsHit.Add(s);
        }

        foreach (var sector in sectorsHit)
        {
            var territories = game.State.Map.Territories.Where(t => t.Sector == sector);

            foreach (var t in territories)
            {
                if (t.Name.Contains("Imperial Basin") || t.Name == "Arrakeen" || t.Name == "Carthag")
                {
                    continue; 
                }

                // 1. Remove Spice
                if (t.SpiceBlowAmount > 0)
                {
                    game.State.ActionLog.Add($"**STORM** destroyed {t.SpiceBlowAmount} spice in **{t.Name}**.");
                    t.SpiceBlowAmount = 0;
                }

                var factions = t.FactionForces.Keys.ToList();
                foreach (var fType in factions)
                {
                    if (fType == Faction.Fremen) continue; 

                    int count = t.FactionForces[fType];
                    if (count > 0)
                    {
                        var faction = game.State.Factions.First(f => f.Faction == fType);

                        faction.ForcesInTanks += count;
                        t.FactionForces.Remove(fType); 

                        game.State.ActionLog.Add(
                            $"**STORM** wiped out {count} {faction.PlayerName} troops in **{t.Name}**.");
                    }
                }
            }
        }
    }

    private async Task RevealPrescienceInfo(Game game, BattleState battle, ulong opponentId)
    {
        if (battle.PrescienceRequest == null) return;

        var req = battle.PrescienceRequest.Value;
        var plan = battle.Plans[opponentId];
        string info = "None";

        switch (req.Type)
        {
            case "Leader": info = plan.LeaderName; break;
            case "Weapon": info = plan.Weapon ?? "None"; break;
            case "Defense": info = plan.Defense ?? "None"; break;
            case "Dial": info = plan.Dial.ToString(); break;
        }

        await _discordService.SendDirectMessageAsync(req.RequesterId,
            $"**[Atreides Prescience]** Opponent's {req.Type} is: **{info}**.");
    }

    private void ValidateVoice(BattleState battle, ulong userId, BattlePlan plan, FactionState faction)
    {
        if (battle.VoiceRestriction.HasValue && battle.VoiceRestriction.Value.TargetId == userId)
        {
            var r = battle.VoiceRestriction.Value;
            bool playedWeapon = !string.IsNullOrEmpty(plan.Weapon);
            bool playedDefense = !string.IsNullOrEmpty(plan.Defense);

            if (r.Type == "Weapon")
            {
                if (r.MustPlay)
                {
                     // Simplification: see original
                }
                else
                {
                    if (playedWeapon) throw new Exception("Voice forbids playing a Weapon!");
                }
            }
            else if (r.Type == "Defense")
            {
                if (r.MustPlay)
                {
                }
                else
                {
                    if (playedDefense) throw new Exception("Voice forbids playing a Defense!");
                }
            }
            else
            {
                bool playedIt = (plan.Weapon == r.Type) || (plan.Defense == r.Type);
                if (r.MustPlay)
                {
                    if (!playedIt && faction.TreacheryCards.Contains(r.Type))
                        throw new Exception($"Voice requires you to play {r.Type}!");
                }
                else
                {
                    if (playedIt) throw new Exception($"Voice forbids playing {r.Type}!");
                }
            }
        }
    }

    private void ResolveBattle(Game game, BattleState battle)
    {
        var p1Id = battle.Faction1Id;
        var p2Id = battle.Faction2Id;

        var plan1 = battle.Plans[p1Id];
        var plan2 = battle.Plans[p2Id];

        var f1 = game.State.Factions.First(f => f.PlayerDiscordId == p1Id);
        var f2 = game.State.Factions.First(f => f.PlayerDiscordId == p2Id);

        game.State.ActionLog.Add(
            $"**Resolution**: {f1.PlayerName} (L: {plan1.LeaderName}, W: {plan1.Weapon}, D: {plan1.Defense}, Dial: {plan1.Dial}) VS {f2.PlayerName} (L: {plan2.LeaderName}, W: {plan2.Weapon}, D: {plan2.Defense}, Dial: {plan2.Dial})");

        bool f1Traitor = f1.Traitors.Contains(plan2.LeaderName); 
        bool f2Traitor = f2.Traitors.Contains(plan1.LeaderName);

        if (f1Traitor && f2Traitor)
        {
            game.State.ActionLog.Add("Both leaders are TRAITORS! Both armies lost.");
            ClearForces(game, battle.TerritoryName, f1.Faction);
            ClearForces(game, battle.TerritoryName, f2.Faction);
            battle.IsActive = false;
            return;
        }
        else if (f1Traitor)
        {
            game.State.ActionLog.Add(
                $"**{plan2.LeaderName}** is a TRAITOR for {f1.PlayerName}! {f1.PlayerName} wins automatically.");
            WinBattle(game, battle, f1, f2, plan1, plan2, 0, true); 
            return;
        }
        else if (f2Traitor)
        {
            game.State.ActionLog.Add(
                $"**{plan1.LeaderName}** is a TRAITOR for {f2.PlayerName}! {f2.PlayerName} wins automatically.");
            WinBattle(game, battle, f2, f1, plan2, plan1, 0, true);
            return;
        }

        bool p1Lasgun = plan1.Weapon?.Contains("Lasgun", StringComparison.OrdinalIgnoreCase) == true;
        bool p1Shield = plan1.Defense?.Contains("Shield", StringComparison.OrdinalIgnoreCase) == true;
        bool p2Lasgun = plan2.Weapon?.Contains("Lasgun", StringComparison.OrdinalIgnoreCase) == true;
        bool p2Shield = plan2.Defense?.Contains("Shield", StringComparison.OrdinalIgnoreCase) == true;

        bool atomicExplosion = (p1Lasgun && p2Shield) || (p2Lasgun && p1Shield);

        if (atomicExplosion)
        {
            game.State.ActionLog.Add(
                "💥 **LASGUN + SHIELD = ATOMIC EXPLOSION!** Both armies destroyed! Battle is a tie.");

            if (!string.IsNullOrEmpty(plan1.LeaderName)) f1.DeadLeaders.Add(plan1.LeaderName);
            if (!string.IsNullOrEmpty(plan2.LeaderName)) f2.DeadLeaders.Add(plan2.LeaderName);

            ClearForces(game, battle.TerritoryName, f1.Faction);
            ClearForces(game, battle.TerritoryName, f2.Faction);

            battle.IsActive = false;
            return;
        }

        bool p1CheapHero = !string.IsNullOrEmpty(plan1.LeaderName) && plan1.Dial == 0;
        bool p2CheapHero = !string.IsNullOrEmpty(plan2.LeaderName) && plan2.Dial == 0;

        if (p1CheapHero && p2CheapHero)
        {
            game.State.ActionLog.Add(
                "💀 Both players used Cheap Hero! Both leaders killed in mutual sacrifice. Battle is a tie.");

            f1.DeadLeaders.Add(plan1.LeaderName);
            f2.DeadLeaders.Add(plan2.LeaderName);

            battle.IsActive = false;
            return;
        }
        else if (p1CheapHero)
        {
            game.State.ActionLog.Add(
                $"🎯 **{f1.PlayerName}** uses Cheap Hero! {plan1.LeaderName} sacrificed for victory.");
            f1.DeadLeaders.Add(plan1.LeaderName);
            WinBattle(game, battle, f1, f2, plan1, plan2, 0, false);
            HandleHarkonnenCapture(game, f1, f2, plan2, false);
            return;
        }
        else if (p2CheapHero)
        {
            game.State.ActionLog.Add(
                $"🎯 **{f2.PlayerName}** uses Cheap Hero! {plan2.LeaderName} sacrificed for victory.");
            f2.DeadLeaders.Add(plan2.LeaderName);
            WinBattle(game, battle, f2, f1, plan2, plan1, 0, false);
            HandleHarkonnenCapture(game, f2, f1, plan1, false);
            return;
        }

        bool l1Dead = IsLeaderKilled(plan1.LeaderName, plan2.Weapon, plan1.Defense);
        bool l2Dead = IsLeaderKilled(plan2.LeaderName, plan1.Weapon, plan2.Defense);

        if (l1Dead)
        {
            game.State.ActionLog.Add($"**{plan1.LeaderName}** killed!");
            f1.DeadLeaders.Add(plan1.LeaderName);
        }

        if (l2Dead)
        {
            game.State.ActionLog.Add($"**{plan2.LeaderName}** killed!");
            f2.DeadLeaders.Add(plan2.LeaderName);
        }

        double s1 = plan1.Dial + (l1Dead ? 0 : 5);
        double s2 = plan2.Dial + (l2Dead ? 0 : 5);

        game.State.ActionLog.Add($"Scores: {f1.PlayerName}={s1}, {f2.PlayerName}={s2}");

        if (s1 > s2)
        {
            WinBattle(game, battle, f1, f2, plan1, plan2, plan1.Dial, false);
            HandleHarkonnenCapture(game, f1, f2, plan2, l2Dead);
        }
        else if (s2 > s1)
        {
            WinBattle(game, battle, f2, f1, plan2, plan1, plan2.Dial, false);
            HandleHarkonnenCapture(game, f2, f1, plan1, l1Dead);
        }
        else
        {
            game.State.ActionLog.Add("Tie! Defender may keep territory. Both lose dial forces.");
            RemoveForces(game, battle.TerritoryName, f1.Faction, plan1.Dial);
            RemoveForces(game, battle.TerritoryName, f2.Faction, plan2.Dial);
            battle.IsActive = false;
        }
    }

    private bool IsLeaderKilled(string leader, string? incomingWeapon, string? myDefense)
    {
        if (string.IsNullOrEmpty(incomingWeapon)) return false;
        if (string.IsNullOrEmpty(myDefense)) return true; 
        return false; 
    }

    private void WinBattle(Game game, BattleState battle, FactionState winner, FactionState loser,
        BattlePlan winnerPlan, BattlePlan loserPlan, int winnerCost, bool traitorWin)
    {
        game.State.ActionLog.Add($"**{winner.PlayerName}** wins!");

        if (!traitorWin)
            RemoveForces(game, battle.TerritoryName, winner.Faction, winnerCost);

        ClearForces(game, battle.TerritoryName, loser.Faction);

        winner.Spice += 5; 
        game.State.ActionLog.Add($"**{winner.PlayerName}** collects 5 spice for the victory.");

        battle.IsActive = false;
    }

    private void RemoveForces(Game game, string territoryName, Faction faction, int amount)
    {
        var t = game.State.Map.Territories.First(x => x.Name == territoryName);
        if (t.FactionForces.ContainsKey(faction))
        {
            t.FactionForces[faction] -= amount;
            if (t.FactionForces[faction] <= 0) t.FactionForces.Remove(faction);

            var fState = game.State.Factions.First(f => f.Faction == faction);
            fState.ForcesInTanks += amount;
        }
    }

    private void ClearForces(Game game, string territoryName, Faction faction)
    {
        var t = game.State.Map.Territories.First(x => x.Name == territoryName);
        if (t.FactionForces.ContainsKey(faction))
        {
            int amount = t.FactionForces[faction];
            t.FactionForces.Remove(faction);

            var fState = game.State.Factions.First(f => f.Faction == faction);
            fState.ForcesInTanks += amount;
        }
    }

    private void HandleHarkonnenCapture(Game game, FactionState winner, FactionState loser, BattlePlan loserPlan,
        bool loserLeaderDead)
    {
        if (winner.Faction == Faction.Harkonnen && !loserLeaderDead && !string.IsNullOrEmpty(loserPlan.LeaderName))
        {
            winner.CapturedLeaders.Add(loserPlan.LeaderName);
            game.State.ActionLog.Add(
                $"**{winner.PlayerName}** (Harkonnen) CAPTURED leader **{loserPlan.LeaderName}**!");
        }
    }
}
