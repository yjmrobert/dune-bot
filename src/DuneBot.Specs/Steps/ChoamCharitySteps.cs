using DuneBot.Domain;
using DuneBot.Domain.State;
using Reqnroll;
using System.Linq;
using Xunit;

namespace DuneBot.Specs.Steps
{
    [Binding]
    public class ChoamCharitySteps
    {
        private readonly GameContext _context;

        public ChoamCharitySteps(GameContext context)
        {
            _context = context;
        }

        [When(@"the CHOAM charity is applied")]
        public async System.Threading.Tasks.Task WhenTheCHOAMCharityIsApplied()
        {
            // Advance phase will trigger CHOAM charity logic
            await _context.Engine.AdvancePhaseAsync(_context.Game.Id);
        }
    }
}
