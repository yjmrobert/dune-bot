using DuneBot.Domain;
using DuneBot.Domain.State;
using DuneBot.Engine;
using DuneBot.Domain.Interfaces;
using Reqnroll;
using Moq;
using System.Collections.Generic;
using System.Linq;
using Xunit;
using System.Threading.Tasks;

namespace DuneBot.Specs.Steps
{
    [Binding]
    public class StormSteps
    {
        private readonly GameContext _context;

        public StormSteps(GameContext context)
        {
            _context = context;
        }

        private Game _game => _context.Game;
        private GameEngine _engine => _context.Engine;
        private DuneBot.Engine.Services.MapService _mapService => _context.MapService;

        [Given(@"a new game is starting")]
        public void GivenANewGameIsStarting()
        {
            _game.State.Turn = 1;
            _game.State.StormLocation = 18; // Standard start
        }

        [Given(@"the current storm position is sector (\d+)")]
        public void GivenTheCurrentStormPositionIsSector(int sector)
        {
            _game.State.StormLocation = sector;
        }
        
        [Given(@"the game is in Turn (\d+)")]
        public void GivenTheGameIsInTurn(int turn)
        {
            _game.State.Turn = turn;
        }

        [Given(@"the following forces are in ""(.*)"" \(Sector (\d+)\):")]
        public void GivenTheFollowingForcesAreIn(string territoryName, int sector, Table table)
        {
            var territory = _game.State.Map.Territories.FirstOrDefault(t => t.Name == territoryName);
            if (territory == null)
            {
                territory = new Territory { Name = territoryName, Sector = sector };
                _game.State.Map.Territories.Add(territory);
            }
            
            foreach (var row in table.Rows)
            {
                var factionName = row["Faction"];
                var count = int.Parse(row["Forces"]);
                var faction = (Faction)System.Enum.Parse(typeof(Faction), factionName);
                
                territory.FactionForces[faction] = count;
                
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
        
        [Given(@"""(.*)"" \(Sector (\d+)\) has (\d+) Spice")]
        public void GivenTerritoryHasSpice(string territoryName, int sector, int amount)
        {
             var territory = _game.State.Map.Territories.FirstOrDefault(t => t.Name == territoryName);
             if (territory == null)
             {
                 territory = new Territory { Name = territoryName, Sector = sector };
                 _game.State.Map.Territories.Add(territory);
             }
             territory.SpiceBlowAmount = amount;
        }

        [When(@"the storm moves (\d+) sectors")]
        public void WhenTheStormMovesSectors(int amount)
        {
            // Bypass handler logic for specific move amount test
            int oldSector = _game.State.StormLocation;
            int newSector = _mapService.CalculateNextStormSector(oldSector, amount);
            _game.State.StormLocation = newSector;
            
            _context.BattleService.ApplyStormDamage(_game, oldSector, amount);
        }
        
        [When(@"the storm moves")]
        public async Task WhenTheStormMoves()
        {
            _game.State.Phase = GamePhase.Storm;
            
            var messageService = new DuneBot.Engine.Services.GameMessageService(); 
            var spiceService = new DuneBot.Engine.Services.SpiceService(_context.MockDeck.Object, messageService);
            
            var handler = new DuneBot.Engine.Phases.StormPhaseHandler(
                spiceService, 
                _context.BattleService, 
                _context.MapService);
                
            await handler.RunPhaseAsync(_game);
        }
        
        [When(@"the First Storm occurs")]
        public async Task WhenTheFirstStormOccurs()
        {
             await WhenTheStormMoves();
        }

        [When(@"the storm moves to sector (\d+)")]
        public void WhenTheStormMovesToSector(int sector)
        {
            _game.State.StormLocation = sector;
            
            // Trigger First Player Update manually using the handler
            var messageService = new DuneBot.Engine.Services.GameMessageService(); 
            var spiceService = new DuneBot.Engine.Services.SpiceService(_context.MockDeck.Object, messageService);
            var handler = new DuneBot.Engine.Phases.StormPhaseHandler(spiceService, _context.BattleService, _context.MapService);
            
            handler.UpdateFirstPlayer(_game);
        }
        
        [Given(@"the storm moves to sector (\d+)")]
        public void GivenTheStormMovesToSector(int sector)
        {
             _game.State.StormLocation = sector;
        }

        [Given(@"the players are seated as follows:")]
        public void GivenThePlayersAreSeatedAsFollows(Table table)
        {
             _game.State.Factions.Clear();
             
             int count = table.Rows.Count;
             int spacing = 18 / (count > 0 ? count : 1);
             
             // Assign Factions to sectors 1, 1+Spacing, etc.
             
             for (int i = 0; i < count; i++)
             {
                  var row = table.Rows[i];
                  var name = row["Faction"];
                  var faction = (Faction)System.Enum.Parse(typeof(Faction), name);
                  
                  // Assign StartSector
                  int sector = 1 + (i * spacing); 
                  
                  _game.State.Factions.Add(new FactionState
                  {
                      Faction = faction,
                      PlayerName = name,
                      PlayerDiscordId = (ulong)(i + 1),
                      StartSector = sector
                  });
             }
        }

        [Then(@"the new storm position should be sector (\d+)")]
        public void ThenTheNewStormPositionShouldBeSector(int expectedSector)
        {
            Assert.Equal(expectedSector, _game.State.StormLocation);
        }
        
        [Then(@"the new storm position should be between (\d+) and (\d+)")]
        public void ThenTheAnd(int min, int max)
        {
             Assert.InRange(_game.State.StormLocation, min, max);
        }

        [Then(@"""(.*)"" should have (\d+) forces in ""(.*)""")]
        public void ThenShouldHaveForcesIn(string factionName, int expectedCount, string territoryName)
        {
            var faction = (Faction)System.Enum.Parse(typeof(Faction), factionName);
            var territory = _game.State.Map.Territories.First(t => t.Name == territoryName);
            
            int actual = territory.FactionForces.ContainsKey(faction) ? territory.FactionForces[faction] : 0;
            Assert.Equal(expectedCount, actual);
        }
        
        [Then(@"""(.*)"" should represent (\d+) forces in the tanks")]
        public void ThenShouldRepresentForcesInTheTanks(string factionName, int expectedTanks)
        {
            var faction = (Faction)System.Enum.Parse(typeof(Faction), factionName);
            var fState = _game.State.Factions.First(f => f.Faction == faction);
            
            Assert.Equal(expectedTanks, fState.ForcesInTanks);
        }
        
        [Then(@"""(.*)"" should have (\d+) Spice")]
        public void ThenTerritoryShouldHaveSpice(string territoryName, int expectedSpice)
        {
             var territory = _game.State.Map.Territories.First(t => t.Name == territoryName);
             Assert.Equal(expectedSpice, territory.SpiceBlowAmount);
        }
        
        [Then(@"the First Player should be ""(.*)""")]
        public void ThenTheFirstPlayerShouldBe(string factionName)
        {
             var fpId = _game.State.FirstPlayerId;
             Assert.NotNull(fpId);
             
             var faction = _game.State.Factions.FirstOrDefault(f => f.PlayerDiscordId == fpId);
             Assert.NotNull(faction);
             Assert.Equal(factionName, faction.Faction.ToString());
        }
    }
}
