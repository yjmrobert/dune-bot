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
        private readonly Mock<IDeckService> _mockDeck;

        public SpiceSteps(GameContext context)
        {
            _context = context;
            _mockDeck = context.MockDeck;
        }

        [Given(@"the next spice card A is ""(.*)""")]
        public void GivenTheNextSpiceCardAIs(string cardName)
        {
             _context.Game.State.SpiceDeck.Insert(0, cardName);
        }
        
        [Given(@"the next spice card B is ""(.*)""")]
        public void GivenTheNextSpiceCardBIs(string cardName)
        {
             if (_context.Game.State.SpiceDeck.Count > 1) 
                 _context.Game.State.SpiceDeck.Insert(1, cardName);
             else
                 _context.Game.State.SpiceDeck.Add(cardName);
        }
        
        [Given(@"the next spice card C is ""(.*)""")]
        public void GivenTheNextSpiceCardCIs(string cardName)
        {
             if (_context.Game.State.SpiceDeck.Count > 2)
                 _context.Game.State.SpiceDeck.Insert(2, cardName); 
             else
                 _context.Game.State.SpiceDeck.Add(cardName);
        }
        
        // Removed GivenTheCurrentStormPositionIsSector
        
        [Given(@"""(.*)"" \(Sector (\d+)\) is in the storm \(Sector (\d+)\)")]
        public void GivenTerritoryIsInTheStorm(string territoryName, int tSector, int sSector)
        {
             var t = _context.Game.State.Map.Territories.FirstOrDefault(x => x.Name == territoryName);
             if (t == null)
             {
                 t = new Territory { Name = territoryName, Sector = tSector };
                 _context.Game.State.Map.Territories.Add(t);
             }
             t.Sector = tSector;
             _context.Game.State.StormLocation = sSector;
             Assert.Equal(t.Sector, _context.Game.State.StormLocation);
        }
        
        [Given(@"the discard pile has ""(.*)"" on top")]
        public void GivenTheDiscardPileHasOnTop(string cardName)
        {
             _context.Game.State.SpiceDiscard.Add(cardName);
        }
        
        [Given(@"territory ""(.*)"" has (\d+) spice")]
        public void GivenTerritoryHasSpice(string territoryName, int amount)
        {
             var t = _context.Game.State.Map.Territories.FirstOrDefault(x => x.Name == territoryName);
             if (t == null)
             {
                 t = new Territory { Name = territoryName };
                 _context.Game.State.Map.Territories.Add(t);
             }
             t.SpiceBlowAmount = amount;
        }
        
        // Removed GivenHasForcesIn
        
        // Removed GivenTheGameIsInTurn

        [When(@"the spice blow is resolved")]
        public void WhenTheSpiceBlowIsResolved()
        {
             var service = new DuneBot.Engine.Services.SpiceService(_context.MockDeck.Object, new DuneBot.Engine.Services.GameMessageService());
             var nextPhase = service.ResolveSpiceBlow(_context.Game);
             _context.Game.State.Phase = nextPhase;
        }

        [Then(@"territory ""(.*)"" should have (\d+) spice")]
        public void ThenTerritoryShouldHaveSpice(string territoryName, int amount)
        {
             var t = _context.Game.State.Map.Territories.FirstOrDefault(x => x.Name == territoryName);
             Assert.NotNull(t);
             Assert.Equal(amount, t.SpiceBlowAmount);
        }
        
        // Removed ThenShouldHaveForcesIn
        
        [Then(@"the spice discard pile should contain ""(.*)""")]
        public void ThenTheSpiceDiscardPileShouldContain(string cardName)
        {
             Assert.Contains(cardName, _context.Game.State.SpiceDiscard);
        }
        
        [Then(@"a Nexus should occur")]
        public void ThenANexusShouldOccur()
        {
             Assert.Equal(GamePhase.Nexus, _context.Game.State.Phase);
        }
    }
}
