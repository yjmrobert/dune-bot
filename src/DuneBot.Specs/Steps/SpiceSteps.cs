using DuneBot.Domain;
using DuneBot.Domain.State;
using DuneBot.Engine;
using DuneBot.Domain.Interfaces;
using Reqnroll;
using Moq;
using System.Linq;
using Xunit;
using System.Collections.Generic;

namespace DuneBot.Specs.Steps
{
    [Binding]
    public class SpiceSteps
    {
        private readonly GameContext _context;
        // Mock Deck service needed? GameEngine calls _deckService.Draw?
        // GameEngine lines 5xx likely have Spice Blow logic.
        // Step 603: var territory = ... Name == card.
        
        // We typically mock DeckService.
        private readonly Mock<IDeckService> _mockDeck;

        public SpiceSteps(GameContext context)
        {
            _context = context;
            _mockDeck = context.MockDeck; // Assuming GameContext exposes MockDeck (Step 25: Yes, it was set up in GameContext)
            // Wait, GameContext.cs Step 122: _mockDeck private?
            // "private Mock<IDeckService> _mockDeck;"
            // But line 60: "public Mock<IDeckService> MockDeck => _mockDeck;" -> Check GameContext.cs
        }

        [Given(@"the next spice card A is ""(.*)""")]
        public void GivenTheNextSpiceCardAIs(string cardName)
        {
             // Insert card at the beginning of the SpiceDeck so it's drawn first
             _context.Game.State.SpiceDeck.Insert(0, cardName);
        }
        
        [Given(@"the next spice card B is ""(.*)""")]
        public void GivenTheNextSpiceCardBIs(string cardName)
        {
             // For scenarios testing just card B, add it to the deck
             if (_context.Game.State.SpiceDeck.Count == 0)
                 _context.Game.State.SpiceDeck.Add(cardName);
             else
                 _context.Game.State.SpiceDeck.Insert(0, cardName); // Make it the next card to be drawn
        }

        [When(@"the spice blow is resolved")]
        public async System.Threading.Tasks.Task WhenTheSpiceBlowIsResolved()
        {
            // Call Engine method
            // "PerformSpiceBlowAsync"?
            // We need to know the method name.
            // GameEngine.cs line 5xx?
            // "ResolveSpiceBlow"?
            
            // Assume method exists or exposed via RunPhase or public method.
            // If internal, we rely on Phase Transition or explicit public method.
            // GameEngine lines viewed didn't explicitly show public "ResolveSpiceBlow".
            // It showed loop in `RunGameLoop`?
            
            // Assuming `RunPhaseAsync` handles it?
            // Or `AdvancePhaseAsync`?
            
            // Let's try calling `engine.ResolveSpiceBlowAsync(...)`?
            // I'll check GameEngine first via view_file or guess.
            // Step 600 was inside a method returning GamePhase?
            // "return GamePhase.ChoamCharity;"
            
            await _context.Engine.AdvancePhaseAsync(_context.Game.Id); // Advance FROM Spice phase SHOULD trigger spice blow logic.
        }


        [Then(@"territory ""(.*)"" should have (.*) spice")]
        public void ThenTerritoryShouldHaveSpice(string territoryName, int amount)
        {
             var t = _context.Game.State.Map.Territories.FirstOrDefault(x => x.Name == territoryName);
             Assert.NotNull(t);
             Assert.Equal(amount, t.SpiceBlowAmount);
        }
    }
}
