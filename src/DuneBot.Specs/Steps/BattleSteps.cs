using DuneBot.Domain.State;
using DuneBot.Domain;
using DuneBot.Engine;
using DuneBot.Domain.Interfaces;
using Reqnroll;
using Moq;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Xunit; // For assertions

namespace DuneBot.Specs.Steps
{
    [Binding]
    public class BattleSteps
    {
        private readonly GameContext _context;
        private readonly ScenarioContext _scenarioContext;

        public BattleSteps(GameContext context, ScenarioContext scenarioContext)
        {
            _context = context;
            _scenarioContext = scenarioContext;
            // Existing tests might rely on default Phase=Battle if they don't have a Given step.
            // We should check Feature file. If it has Given, we don't need to force it here.
            // But if we want to be safe, we can set it if it's default check. 
            // Better: rely on Scenario to set it. We'll verify Battle.feature next.
        }

        private Game _game => _context.Game;
        private GameEngine _engine => _context.Engine;

        [Given(@"the following factions are in a battle in ""(.*)""")]
        [Given(@"the following factions are in a battle in ""(.*)"":")]
        public void GivenTheFollowingFactionsAreInABattleIn(string territory, Table table)
        {
            _game.State.CurrentBattle = new BattleState
            {
                IsActive = true,
                TerritoryName = territory,
                Plans = new Dictionary<ulong, BattlePlan>()
            };

            // Setup forces in territory
            var t = _game.State.Map.Territories.FirstOrDefault(x => x.Name == territory);
            if (t == null)
            {
                t = new Territory { Name = territory };
                _game.State.Map.Territories.Add(t);
            }

            foreach (var row in table.Rows)
            {
                var name = row["Faction"];
                var leader = row["Leader"]; // Name
                // Strength column unused in SubmitPlan but useful for context? Engine uses fixed 5.
                // Weapon/Defense/Dial
                var dial = int.Parse(row["Dial"]);

                var factionEnum = (Faction)System.Enum.Parse(typeof(Faction), name);
                var id = (ulong)name.Length; // Fake ID

                var f = new FactionState
                {
                    PlayerDiscordId = id,
                    PlayerName = name,
                    Faction = factionEnum,
                    Traitors = new List<string>(), // Default empty
                    TreacheryCards = new List<string>() // Default empty
                };

                // Give cards if specified (MVP: Assume they have them for test simplicity)
                var weapon = row["Weapon"] == "None" ? null : row["Weapon"];
                if (weapon != null) f.TreacheryCards.Add(weapon);

                var defense = row["Defense"] == "None" ? null : row["Defense"];
                if (defense != null) f.TreacheryCards.Add(defense);

                _game.State.Factions.Add(f);

                // Add forces to territory so dial is valid
                t.FactionForces[factionEnum] = 20;

                // Fill Battle IDs
                if (_game.State.CurrentBattle.Faction1Id == 0) _game.State.CurrentBattle.Faction1Id = id;
                else _game.State.CurrentBattle.Faction2Id = id;

                // We store the input rows to Submit later
                // Or submit now? No, "When battle is resolved".
                // But Given usually sets up state.
                // I'll make a helper to submit in "When". (Store data in ScenarioContext? or just private list)
            }

            _scenarioContext["TableData"] = table;
        }


        [When(@"the battle is resolved")]
        public async Task WhenTheBattleIsResolved()
        {
            var table = (Table)_scenarioContext["TableData"];
            foreach (var row in table.Rows)
            {
                var name = row["Faction"];
                var id = (ulong)name.Length;

                var leader = row["Leader"];
                var dial = int.Parse(row["Dial"]);
                var weapon = row["Weapon"] == "None" ? null : row["Weapon"];
                var defense = row["Defense"] == "None" ? null : row["Defense"];

                try
                {
                    await _engine.SubmitBattlePlanAsync(1, id, leader, dial, weapon, defense);
                }
                catch (System.Exception ex)
                {
                    _scenarioContext["ErrorException"] = ex;
                }
            }
        }

        [Then(@"the winner should be ""(.*)""")]
        public void ThenTheWinnerShouldBe(string winnerName)
        {
            // How to check winner? 
            // 1. ActionLog
            // 2. Forces remaining ( Winner stays / Loser leaves)
            // 3. BattleState IsActive = false

            var log = _game.State.ActionLog.LastOrDefault(l => l.Contains("wins!"));
            Assert.Contains(winnerName, log);
        }

        [Then(@"""(.*)"" should lose all forces in ""(.*)""")]
        public void ThenShouldLoseAllForcesIn(string loserName, string territory)
        {
            var factionEnum = (Faction)System.Enum.Parse(typeof(Faction), loserName);
            var t = _game.State.Map.Territories.First(x => x.Name == territory);

            Assert.False(t.FactionForces.ContainsKey(factionEnum), $"{loserName} should have no forces in {territory}");
        }

        [Given(@"""(.*)"" has a traitor called ""(.*)""")]
        public void GivenHasATraitorCalled(string factionName, string traitorName)
        {
            var f = _game.State.Factions.First(x => x.PlayerName == factionName);
            f.Traitors.Add(traitorName);
        }

        [Then(@"""(.*)"" should have captured ""(.*)""")]
        public void ThenShouldHaveCaptured(string factionName, string leaderName)
        {
            var f = _game.State.Factions.First(x => x.PlayerName == factionName);
            Assert.Contains(leaderName, f.CapturedLeaders);

            // Or check logic?
            // Since "Duncan" is usually just the name. 
            // Leader capture logic puts the string into CapturedLeaders list.
        }

        [Given(@"""(.*)"" uses Voice on ""(.*)"" to forbid ""(.*)""")]
        public void GivenUsesVoiceToForbid(string user, string target, string card)
        {
            Assert.NotNull(_game.State.CurrentBattle);
            _game.State.CurrentBattle!.VoiceRestriction = ((ulong)target.Length, card, false); // false = forbid
        }

        [Given(@"""(.*)"" uses Voice on ""(.*)"" to force ""(.*)""")]
        public void GivenUsesVoiceToForce(string user, string target, string card)
        {
            Assert.NotNull(_game.State.CurrentBattle);
            _game.State.CurrentBattle!.VoiceRestriction = ((ulong)target.Length, card, true); // true = force
        }

        [Given(@"""(.*)"" holds ""(.*)""")]
        public void GivenHolds(string factionName, string card)
        {
            var f = _game.State.Factions.First(f => f.PlayerName == factionName);
            f.TreacheryCards.Add(card);
        }


        [Then(@"the battle should result in a tie")]
        public void ThenTheBattleShouldResultInATie()
        {
            var log = _game.State.ActionLog.LastOrDefault(l =>
                l.Contains("Tie!", System.StringComparison.OrdinalIgnoreCase) ||
                l.Contains("tie.", System.StringComparison.OrdinalIgnoreCase));
            Assert.NotNull(log);
            Assert.False(_game.State.CurrentBattle!.IsActive);
        }

        [Then(@"""(.*)"" should be in dead leaders for ""(.*)""")]
        public void ThenShouldBeInDeadLeadersFor(string leaderName, string factionName)
        {
            var f = _game.State.Factions.First(x => x.PlayerName == factionName);
            Assert.Contains(leaderName, f.DeadLeaders);
        }

        [Then(@"""(.*)"" should have won with 0 force loss")]
        public void ThenShouldHaveWonWithZeroForceLoss(string winnerName)
        {
            // Verify winner
            ThenTheWinnerShouldBe(winnerName);

            var factionEnum = (Faction)System.Enum.Parse(typeof(Faction), winnerName);
            var battle = _game.State.CurrentBattle;
            var t = _game.State.Map.Territories.First(x => x.Name == battle!.TerritoryName);

            // In setup we gave 20 forces. If loss is 0, should still be 20.
            Assert.Equal(20, t.FactionForces[factionEnum]);
        }
    }
}
