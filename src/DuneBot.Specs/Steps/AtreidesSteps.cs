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
    public class AtreidesSteps
    {
        private readonly GameContext _context;

        public AtreidesSteps(GameContext context)
        {
            _context = context;
        }

        [Given(@"the ""(.*)"" faction is in the game")]
        public void GivenTheFactionIsInTheGame(string factionName)
        {
             // Ensure faction exists
             var faction = (Faction)System.Enum.Parse(typeof(Faction), factionName);
             if (!_context.Game.State.Factions.Any(f => f.Faction == faction))
             {
                 _context.Game.State.Factions.Add(new FactionState 
                 { 
                     Faction = faction, 
                     PlayerName = factionName,
                     PlayerDiscordId = (ulong)factionName.Length 
                 });
             }
        }

        [Given(@"the next card in the deck is ""(.*)""")]
        public void GivenTheNextCardInTheDeckIs(string cardName)
        {
            // Setup deck in state. The engine grabs 'TreacheryDeck' from State, but initializes it using DeckService.
            // Wait, StartBiddingPhase calls _deckService.Draw(game.State.TreacheryDeck...).
            // So we need to ensure game.State.TreacheryDeck has the card.
            _context.Game.State.TreacheryDeck = new System.Collections.Generic.List<string> { cardName };
            
            // AND we need to mock DeckService.Draw to work with that list?
            // Engine calls `_deckService.Draw`.
            // Default mock returns null. We must setup Draw.
            _context.MockDeck.Setup(d => d.Draw(It.IsAny<System.Collections.Generic.List<string>>(), It.IsAny<System.Collections.Generic.List<string>>()))
                .Returns((System.Collections.Generic.List<string> deck, System.Collections.Generic.List<string> discard) => 
                {
                    if (deck.Any()) 
                    {
                         var c = deck[0];
                         deck.RemoveAt(0);
                         return c;
                    }
                    return null!; // Bypass nullable warning to match Engine expectations
                });
        }

        [When(@"the phase advances to ""(.*)""")]
        public async System.Threading.Tasks.Task WhenThePhaseAdvancesTo(string p0)
        {
            // We call AdvancePhaseAsync. 
            // Note: Engine relies on current phase being correct to transition. 
            // Scenario sets it to ChoamCharity. AdvancePhase should go to Bidding.
            await _context.Engine.AdvancePhaseAsync(_context.Game.Id);
        }

        [Then(@"""(.*)"" should receive a DM containing ""(.*)""")]
        public void ThenShouldReceiveADMContaining(string factionName, string content)
        {
            var id = (ulong)factionName.Length;
            // Verify SendDirectMessageAsync was called
            _context.MockDiscord.Verify(d => d.SendDirectMessageAsync(id, It.Is<string>(s => s.Contains(content))), Times.AtLeastOnce);
        }
    }
}
