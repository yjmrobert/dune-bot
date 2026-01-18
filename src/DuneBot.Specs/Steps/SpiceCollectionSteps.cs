using DuneBot.Domain;
using DuneBot.Domain.State;
using Reqnroll;
using System.Linq;
using Xunit;

namespace DuneBot.Specs.Steps
{
    [Binding]
    public class SpiceCollectionSteps
    {
        private readonly GameContext _context;

        public SpiceCollectionSteps(GameContext context)
        {
            _context = context;
        }

        [Given(@"territory ""(.*)"" contains (.*) spice")]
        public void GivenTerritoryContainsSpice(string territoryName, int amount)
        {
            var t = _context.Game.State.Map.Territories.FirstOrDefault(x => x.Name == territoryName);
            if (t == null)
            {
                t = new Territory { Name = territoryName };
                _context.Game.State.Map.Territories.Add(t);
            }
            t.SpiceBlowAmount = amount;
        }

        [When(@"spice collection is resolved")]
        public async System.Threading.Tasks.Task WhenSpiceCollectionIsResolved()
        {
            // Advance phase will trigger spice collection logic
            await _context.Engine.AdvancePhaseAsync(_context.Game.Id);
        }

        [Then(@"""(.*)"" should have (.*) spice remaining")]
        public void ThenShouldHaveSpiceRemaining(string territoryName, int amount)
        {
            var t = _context.Game.State.Map.Territories.FirstOrDefault(x => x.Name == territoryName);
            Assert.NotNull(t);
            Assert.Equal(amount, t.SpiceBlowAmount);
        }
    }
}
