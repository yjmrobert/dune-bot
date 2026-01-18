using DuneBot.Domain;
using DuneBot.Domain.State;
using DuneBot.Engine;
using DuneBot.Domain.Interfaces;
using Reqnroll;
using Moq;
using System.Collections.Generic;
using System.Linq;
using Xunit;

namespace DuneBot.Specs.Steps
{
    [Binding]
    public class StormSteps
    {
        private Game _game;
        private GameEngine _engine;
        private Mock<IGameRepository> _mockRepo;
        private Mock<IDiscordService> _mockDiscord;
        private Mock<IGameRenderer> _mockRenderer;
        private Mock<IDeckService> _mockDeck;
        private readonly DuneBot.Engine.Services.MapService _mapService;

        public StormSteps()
        {
            _mockRepo = new Mock<IGameRepository>();
            _mockDiscord = new Mock<IDiscordService>();
            _mockRenderer = new Mock<IGameRenderer>();
            _mockDeck = new Mock<IDeckService>();
            _mapService = new DuneBot.Engine.Services.MapService();

            _engine = new GameEngine(_mockRepo.Object, _mockDiscord.Object, _mockRenderer.Object, _mapService, _mockDeck.Object);
            
            _game = new Game 
            { 
                State = new GameState 
                { 
                    Phase = GamePhase.Storm,
                    Turn = 1,
                    StormLocation = 18 // Default
                } 
            };
            
            // Initialize Map
            _game.State.Map = _mapService.InitializeMap();
            
            _mockRepo.Setup(r => r.GetGameAsync(It.IsAny<int>())).ReturnsAsync(_game);
        }

        [Given(@"the current storm position is sector (.*)")]
        public void GivenTheCurrentStormPositionIsSector(int sector)
        {
            _game.State.StormLocation = sector;
        }

        [Given(@"the following forces are in ""(.*)"" \(Sector (.*)\):")]
        public void GivenTheFollowingForcesAreIn(string territoryName, int sector, Table table)
        {
            // Ensure territory exists (MapService initializes standard ones, but we might need to overwrite or find)
            var territory = _game.State.Map.Territories.FirstOrDefault(t => t.Name == territoryName);
            if (territory == null)
            {
                // Fallback for custom names defined in feature, though usually we match map
                territory = new Territory { Name = territoryName, Sector = sector };
                _game.State.Map.Territories.Add(territory);
            }
            
            foreach (var row in table.Rows)
            {
                var factionName = row["Faction"];
                var count = int.Parse(row["Forces"]);
                var faction = (Faction)System.Enum.Parse(typeof(Faction), factionName);
                
                territory.FactionForces[faction] = count;
                
                // Ensure faction exists in state
                if (!_game.State.Factions.Any(f => f.Faction == faction))
                {
                    _game.State.Factions.Add(new FactionState 
                    { 
                        Faction = faction, 
                        PlayerName = factionName,
                        PlayerDiscordId = (ulong)factionName.Length 
                    });
                }
            }
        }

        [When(@"the storm moves (.*) sectors")]
        public void WhenTheStormMovesSectors(int amount)
        {
            // We bypass the random generation in AdvancePhase and call ApplyStormDamage directly
            // AND manually update the location, simulating what the engine does.
            
            int oldSector = _game.State.StormLocation;
            int newSector = _mapService.CalculateNextStormSector(oldSector, amount);
            _game.State.StormLocation = newSector;
            
            _engine.ApplyStormDamage(_game, oldSector, amount);
        }

        [Then(@"the new storm position should be sector (.*)")]
        public void ThenTheNewStormPositionShouldBeSector(int expectedSector)
        {
            Assert.Equal(expectedSector, _game.State.StormLocation);
        }

        [Then(@"""(.*)"" should have (.*) forces in ""(.*)""")]
        public void ThenShouldHaveForcesIn(string factionName, int expectedCount, string territoryName)
        {
            var faction = (Faction)System.Enum.Parse(typeof(Faction), factionName);
            var territory = _game.State.Map.Territories.First(t => t.Name == territoryName);
            
            int actual = territory.FactionForces.ContainsKey(faction) ? territory.FactionForces[faction] : 0;
            Assert.Equal(expectedCount, actual);
        }
        
        [Then(@"""(.*)"" should represent (.*) forces in the tanks")]
        public void ThenShouldRepresentForcesInTheTanks(string factionName, int expectedTanks)
        {
            var faction = (Faction)System.Enum.Parse(typeof(Faction), factionName);
            var fState = _game.State.Factions.First(f => f.Faction == faction);
            
            Assert.Equal(expectedTanks, fState.ForcesInTanks);
        }
    }
}
