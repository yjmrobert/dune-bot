using System.Linq;
using Reqnroll;
using DuneBot.Specs.Steps;

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

        // Feature says: When "Atreides" claims CHOAM charity
        [When(@"""(.*)"" claims CHOAM charity")]
        public async System.Threading.Tasks.Task WhenClaimsCHOAMCharity(string factionName)
        {
            var faction = _context.Game.State.Factions.First(f => f.PlayerName == factionName);
            if (faction.PlayerDiscordId == null) 
            {
                faction.PlayerDiscordId = (ulong)faction.Faction; 
            }

            try
            {
                await _context.Engine.ClaimCharityAsync(_context.Game.Id, faction.PlayerDiscordId.Value);
            }
            catch
            {
                // Ignore error so we can test "no change" scenario
            }
        }
    }
}
