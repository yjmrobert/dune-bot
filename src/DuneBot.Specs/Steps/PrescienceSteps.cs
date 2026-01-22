using DuneBot.Domain;
using DuneBot.Domain.State;
using Reqnroll;
using System.Linq;
using Xunit;
using Moq;

namespace DuneBot.Specs.Steps
{
    [Binding]
    public class PrescienceSteps
    {
        private readonly GameContext _context;
        private readonly ScenarioContext _scenarioContext;

        public PrescienceSteps(GameContext context, ScenarioContext scenarioContext)
        {
            _context = context;
            _scenarioContext = scenarioContext;
        }

        [Given(@"there is an active battle in ""(.*)""")]
        public void GivenThereIsAnActiveBattleIn(string territoryName)
        {
            // Create an active battle
            _context.Game.State.CurrentBattle = new BattleState
            {
                TerritoryName = territoryName,
                IsActive = true,
                Faction1Id = 0, // Will be set when factions join
                Faction2Id = 0,
                Plans = new System.Collections.Generic.Dictionary<ulong, BattlePlan>()
            };
        }

        [Given(@"""(.*)"" is in the battle")]
        public void GivenIsInTheBattle(string factionName)
        {
            var faction = (Faction)System.Enum.Parse(typeof(Faction), factionName);
            var fState = _context.Game.State.Factions.FirstOrDefault(f => f.Faction == faction);
            if (fState == null)
            {
                fState = new FactionState
                {
                    Faction = faction,
                    PlayerName = factionName,
                    PlayerDiscordId = (ulong)factionName.GetHashCode()
                };
                _context.Game.State.Factions.Add(fState);
            }

            var battle = _context.Game.State.CurrentBattle;
            Assert.NotNull(battle);

            if (battle.Faction1Id == 0)
            {
                battle.Faction1Id = fState!.PlayerDiscordId!.Value;
            }
            else if (battle.Faction2Id == 0)
            {
                battle.Faction2Id = fState!.PlayerDiscordId!.Value;
            }

            // Add forces to the battle territory
            var territory = _context.Game.State.Map.Territories.FirstOrDefault(t => t.Name == battle.TerritoryName);
            if (territory == null)
            {
                territory = new Territory { Name = battle.TerritoryName };
                _context.Game.State.Map.Territories.Add(territory);
            }

            if (!territory.FactionForces.ContainsKey(faction))
            {
                territory.FactionForces[faction] = 10; // Add some forces for battle
            }
        }

        [When(@"""(.*)"" uses Prescience to reveal ""(.*)""")]
        public async System.Threading.Tasks.Task WhenUsesPrescienceToReveal(string factionName, string type)
        {
            var faction = (Faction)System.Enum.Parse(typeof(Faction), factionName);
            var fState = _context.Game.State.Factions.First(f => f.Faction == faction);

            try
            {
                await _context.Engine.UsePrescienceAsync(_context.Game.Id, fState.PlayerDiscordId!.Value, type);
            }
            catch (System.Exception ex)
            {
                _scenarioContext["ErrorException"] = ex;
            }
        }

        [When(@"""(.*)"" submits battle plan with leader ""(.*)""")]
        public async System.Threading.Tasks.Task WhenSubmitsBattlePlanWithLeader(string factionName, string leaderName)
        {
            var faction = (Faction)System.Enum.Parse(typeof(Faction), factionName);
            var fState = _context.Game.State.Factions.First(f => f.Faction == faction);

            await _context.Engine.SubmitBattlePlanAsync(_context.Game.Id, fState.PlayerDiscordId!.Value, leaderName, 5,
                null, null);
        }

        [When(@"""(.*)"" submits battle plan with dial (.*)")]
        public async System.Threading.Tasks.Task WhenSubmitsBattlePlanWithDial(string factionName, int dial)
        {
            var faction = (Faction)System.Enum.Parse(typeof(Faction), factionName);
            var fState = _context.Game.State.Factions.First(f => f.Faction == faction);

            await _context.Engine.SubmitBattlePlanAsync(_context.Game.Id, fState.PlayerDiscordId!.Value, "TestLeader",
                dial, null, null);
        }

        [When(@"""(.*)"" submits battle plan with weapon ""(.*)""")]
        public async System.Threading.Tasks.Task WhenSubmitsBattlePlanWithWeapon(string factionName, string weapon)
        {
            var faction = (Faction)System.Enum.Parse(typeof(Faction), factionName);
            var fState = _context.Game.State.Factions.First(f => f.Faction == faction);

            // Add card to hand
            if (!fState.TreacheryCards.Contains(weapon))
                fState.TreacheryCards.Add(weapon);

            await _context.Engine.SubmitBattlePlanAsync(_context.Game.Id, fState.PlayerDiscordId!.Value, "TestLeader", 5,
                weapon, null);
        }

        [When(@"""(.*)"" submits battle plan with defense ""(.*)""")]
        public async System.Threading.Tasks.Task WhenSubmitsBattlePlanWithDefense(string factionName, string defense)
        {
            var faction = (Faction)System.Enum.Parse(typeof(Faction), factionName);
            var fState = _context.Game.State.Factions.First(f => f.Faction == faction);

            // Add card to hand
            if (!fState.TreacheryCards.Contains(defense))
                fState.TreacheryCards.Add(defense);

            await _context.Engine.SubmitBattlePlanAsync(_context.Game.Id, fState.PlayerDiscordId!.Value, "TestLeader", 5,
                null, defense);
        }

        [Then(@"""(.*)"" should receive DM revealing ""(.*)""")]
        public void ThenShouldReceiveDMRevealing(string factionName, string expectedInfo)
        {
            var faction = (Faction)System.Enum.Parse(typeof(Faction), factionName);
            var fState = _context.Game.State.Factions.First(f => f.Faction == faction);

            // Verify the mock Discord service was called with a DM containing the expected info
            _context.MockDiscord.Verify(
                d => d.SendDirectMessageAsync(
                    fState.PlayerDiscordId!.Value,
                    It.Is<string>(msg => msg.Contains(expectedInfo))),
                Moq.Times.AtLeastOnce());
        }
    }
}
