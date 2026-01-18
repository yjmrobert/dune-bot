using DuneBot.Domain;
using DuneBot.Domain.State;
using DuneBot.Engine;
using Reqnroll;
using System.Linq;
using Xunit;

namespace DuneBot.Specs.Steps
{
    [Binding]
    public class RevivalSteps
    {
        private readonly GameContext _context;
        private readonly ScenarioContext _scenarioContext;

        public RevivalSteps(GameContext context, ScenarioContext scenarioContext)
        {
            _context = context;
            _scenarioContext = scenarioContext;
        }

        [Given(@"""(.*)"" has ""(.*)"" in their dead leaders")]
        public void GivenHasInTheirDeadLeaders(string factionName, string leaderName)
        {
            var faction = (Faction)System.Enum.Parse(typeof(Faction), factionName);
            var fState = _context.Game.State.Factions.FirstOrDefault(f => f.Faction == faction);
            if (fState == null)
            {
                fState = new FactionState
                {
                    Faction = faction,
                    PlayerName = factionName,
                    PlayerDiscordId = (ulong)factionName.Length
                };
                _context.Game.State.Factions.Add(fState);
            }
            
            fState.DeadLeaders.Add(leaderName);
        }

        [Given(@"""(.*)"" has (.*) forces in tanks")]
        public void GivenHasForcesInTanks(string factionName, int amount)
        {
            var faction = (Faction)System.Enum.Parse(typeof(Faction), factionName);
            var fState = _context.Game.State.Factions.FirstOrDefault(f => f.Faction == faction);
            if (fState == null)
            {
                fState = new FactionState
                {
                    Faction = faction,
                    PlayerName = factionName,
                    PlayerDiscordId = (ulong)factionName.Length
                };
                _context.Game.State.Factions.Add(fState);
            }
            
            fState.ForcesInTanks = amount;
        }

        [When(@"""(.*)"" revives leader ""(.*)""")]
        public async System.Threading.Tasks.Task WhenRevivesLeader(string factionName, string leaderName)
        {
            var id = (ulong)factionName.Length;
            try
            {
                await _context.Engine.ReviveLeaderAsync(_context.Game.Id, id, leaderName);
            }
            catch (System.Exception ex)
            {
                _scenarioContext["ErrorException"] = ex;
            }
        }

        [When(@"""(.*)"" revives (.*) forces")]
        public async System.Threading.Tasks.Task WhenRevivesForces(string factionName, int amount)
        {
            var id = (ulong)factionName.Length;
            try
            {
                await _context.Engine.ReviveForcesAsync(_context.Game.Id, id, amount);
            }
            catch (System.Exception ex)
            {
                _scenarioContext["ErrorException"] = ex;
            }
        }

        [Then(@"""(.*)"" should not have ""(.*)"" in their dead leaders")]
        public void ThenShouldNotHaveInTheirDeadLeaders(string factionName, string leaderName)
        {
            var faction = (Faction)System.Enum.Parse(typeof(Faction), factionName);
            var fState = _context.Game.State.Factions.First(f => f.Faction == faction);
            Assert.DoesNotContain(leaderName, fState.DeadLeaders);
        }

        [Then(@"""(.*)"" should have (.*) forces in reserves")]
        public void ThenShouldHaveForcesInReserves(string factionName, int amount)
        {
            var faction = (Faction)System.Enum.Parse(typeof(Faction), factionName);
            var fState = _context.Game.State.Factions.First(f => f.Faction == faction);
            Assert.Equal(amount, fState.Reserves);
        }

        [Then(@"""(.*)"" should have (.*) forces in tanks")]
        public void ThenShouldHaveForcesInTanks(string factionName, int amount)
        {
            var faction = (Faction)System.Enum.Parse(typeof(Faction), factionName);
            var fState = _context.Game.State.Factions.First(f => f.Faction == faction);
            Assert.Equal(amount, fState.ForcesInTanks);
        }
    }
}
