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
    public class ShipmentSteps
    {
        private readonly GameContext _context;
        private readonly ScenarioContext _scenarioContext;

        public ShipmentSteps(GameContext context, ScenarioContext scenarioContext)
        {
            _context = context;
            _scenarioContext = scenarioContext;
        }

        [Given(@"""(.*)"" has (.*) spice")]
        public void GivenHasSpice(string factionName, int amount)
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
            fState.Spice = amount;
        }

        [Given(@"""(.*)"" has (.*) forces in reserves")]
        public void GivenHasForcesInReserves(string factionName, int amount)
        {
            var faction = (Faction)System.Enum.Parse(typeof(Faction), factionName);
            var fState = _context.Game.State.Factions.First(f => f.Faction == faction);
            fState.Reserves = amount;
        }
        
        [Given(@"the storm is at sector (.*)")]
        public void GivenTheStormIsAtSector(int sector)
        {
            _context.Game.State.StormLocation = sector;
        }

        [When(@"""(.*)"" ships (.*) forces to ""(.*)"" \(Sector (.*)\)")]
        public async System.Threading.Tasks.Task WhenShipsForcesToSector(string factionName, int amount, string territoryName, int sector)
        {
            // Ensure territory exists in Map
            var t = _context.Game.State.Map.Territories.FirstOrDefault(x => x.Name == territoryName);
            if (t == null)
            {
                t = new Territory { Name = territoryName, Sector = sector };
                _context.Game.State.Map.Territories.Add(t);
            }
            
            var id = (ulong)factionName.Length;
            try
            {
                await _context.Engine.ShipForcesAsync(_context.Game.Id, id, territoryName, amount);
            }
            catch (System.Exception ex)
            {
                 _scenarioContext["ErrorException"] = ex;
            }
        }




    }
}
