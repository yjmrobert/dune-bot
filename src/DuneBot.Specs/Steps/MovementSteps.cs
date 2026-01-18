using DuneBot.Domain;
using DuneBot.Domain.State;
using DuneBot.Engine;
using DuneBot.Domain.Interfaces;
using Reqnroll;
using Moq;
using System.Linq;
using Xunit;

namespace DuneBot.Specs.Steps
{
    [Binding]
    public class MovementSteps
    {
        private readonly GameContext _context;
        private readonly ScenarioContext _scenarioContext;

        public MovementSteps(GameContext context, ScenarioContext scenarioContext)
        {
            _context = context;
            _scenarioContext = scenarioContext;
        }

        [Given(@"""(.*)"" has (.*) forces in ""(.*)""")]
        public void GivenHasForcesIn(string factionName, int amount, string territoryName)
        {
            var faction = (Faction)System.Enum.Parse(typeof(Faction), factionName);
            
            // Ensure Faction exists
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

            // Ensure Territory exists
            var t = _context.Game.State.Map.Territories.FirstOrDefault(x => x.Name == territoryName);
            // If mocking map, we assume territories exist or we create them.
            // MapService initializes them. But if we need custom setup:
            if (t == null)
            {
                // We trust MapService usually, but implicit creation helps tests.
                // However, creating a territory here might disconnect it from adjacency graph if MapService assumes only init territories.
                // But MapService has hardcoded string connections. So as long as Name matches, it works.
                int sector = 1; // Default
                if (territoryName == "Arrakeen") sector = 3; 
                else if (territoryName.Contains("(S2)")) sector = 2;
                else if (territoryName.Contains("(S3)")) sector = 3;
                
                t = new Territory { Name = territoryName, Sector = sector };
                _context.Game.State.Map.Territories.Add(t);
            }
            
            t.FactionForces[faction] = amount;
        }

        [When(@"""(.*)"" moves (.*) forces from ""(.*)"" to ""(.*)""")]
        public async System.Threading.Tasks.Task WhenMovesForces(string factionName, int amount, string from, string to)
        {
             var id = (ulong)factionName.Length;
             try
             {
                 await _context.Engine.MoveForcesAsync(_context.Game.Id, id, from, to, amount);
             }
             catch (System.Exception ex)
             {
                 _scenarioContext["ErrorException"] = ex;
             }
        }


    }
}
