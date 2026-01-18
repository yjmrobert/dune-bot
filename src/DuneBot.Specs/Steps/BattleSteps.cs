using DuneBot.Domain.State;
using DuneBot.Domain;
using DuneBot.Engine;
using DuneBot.Domain.Interfaces;
using Reqnroll;
using Moq;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Xunit; // For assertions

namespace DuneBot.Specs.Steps
{
    [Binding]
    public class BattleSteps
    {
        private Game _game;
        private GameEngine _engine;
        private Mock<IGameRepository> _mockRepo;
        private Mock<IDiscordService> _mockDiscord;
        private Mock<IGameRenderer> _mockRenderer;
        private Mock<IDeckService> _mockDeck;
        private ScenarioContext _scenarioContext;
        
        public BattleSteps(ScenarioContext scenarioContext)
        {
            _scenarioContext = scenarioContext;
            _mockRepo = new Mock<IGameRepository>();
            _mockDiscord = new Mock<IDiscordService>();
            _mockRenderer = new Mock<IGameRenderer>();
            _mockDeck = new Mock<IDeckService>();
            
            // We need real MapService for logic? Or mock?
            // Engine uses IMapService. Let's use real MapService for integration feel.
            var mapService = new DuneBot.Engine.Services.MapService();
            
            _engine = new GameEngine(_mockRepo.Object, _mockDiscord.Object, _mockRenderer.Object, mapService, _mockDeck.Object);
            
            _game = new Game 
            { 
                State = new GameState 
                { 
                    Phase = GamePhase.Battle,
                    Turn = 1
                } 
            };
            _mockRepo.Setup(r => r.GetGameAsync(It.IsAny<int>())).ReturnsAsync(_game);
        }

        [Given(@"the following factions are in a battle in ""(.*)""")]
        [Given(@"the following factions are in a battle in ""(.*)"":")]
        public void GivenTheFollowingFactionsAreInABattleIn(string territory, Table table)
        {
            _game.State.CurrentBattle = new BattleState 
            { 
                IsActive = true, 
                TerritoryName = territory,
                Plans = new Dictionary<ulong, BattlePlan>() 
            };
            
            // Setup forces in territory
            var t = new Territory { Name = territory };
            _game.State.Map.Territories.Add(t);

            foreach (var row in table.Rows)
            {
                var name = row["Faction"];
                var leader = row["Leader"]; // Name
                // Strength column unused in SubmitPlan but useful for context? Engine uses fixed 5.
                // Weapon/Defense/Dial
                var dial = int.Parse(row["Dial"]);
                
                var factionEnum = (Faction)System.Enum.Parse(typeof(Faction), name);
                var id = (ulong)name.Length; // Fake ID
                
                var f = new FactionState 
                { 
                    PlayerDiscordId = id, 
                    PlayerName = name, 
                    Faction = factionEnum,
                    Traitors = new List<string>(), // Default empty
                    TreacheryCards = new List<string>() // Default empty
                };
                
                // Give cards if specified (MVP: Assume they have them for test simplicity)
                var weapon = row["Weapon"] == "None" ? null : row["Weapon"];
                if (weapon != null) f.TreacheryCards.Add(weapon);
                
                var defense = row["Defense"] == "None" ? null : row["Defense"];
                if (defense != null) f.TreacheryCards.Add(defense);
                
                _game.State.Factions.Add(f);
                
                // Add forces to territory so dial is valid
                t.FactionForces[factionEnum] = 20; 

                // Fill Battle IDs
                if (_game.State.CurrentBattle.Faction1Id == 0) _game.State.CurrentBattle.Faction1Id = id;
                else _game.State.CurrentBattle.Faction2Id = id;
                
                // We store the input rows to Submit later
                // Or submit now? No, "When battle is resolved".
                // But Given usually sets up state.
                // I'll make a helper to submit in "When". (Store data in ScenarioContext? or just private list)
            }
             _scenarioContext["TableData"] = table;
        }
        


        [When(@"the battle is resolved")]
        public async Task WhenTheBattleIsResolved()
        {
            var table = (Table)_scenarioContext["TableData"];
            foreach (var row in table.Rows)
            {
                var name = row["Faction"];
                var id = (ulong)name.Length;
                
                var leader = row["Leader"];
                var dial = int.Parse(row["Dial"]);
                var weapon = row["Weapon"] == "None" ? null : row["Weapon"];
                var defense = row["Defense"] == "None" ? null : row["Defense"];
                
                await _engine.SubmitBattlePlanAsync(1, id, leader, dial, weapon, defense);
            }
        }

        [Then(@"the winner should be ""(.*)""")]
        public void ThenTheWinnerShouldBe(string winnerName)
        {
            // How to check winner? 
            // 1. ActionLog
            // 2. Forces remaining ( Winner stays / Loser leaves)
            // 3. BattleState IsActive = false
            
            var log = _game.State.ActionLog.LastOrDefault(l => l.Contains("wins!"));
            Assert.Contains(winnerName, log);
        }

        [Then(@"""(.*)"" should lose all forces in ""(.*)""")]
        public void ThenShouldLoseAllForcesIn(string loserName, string territory)
        {
            var factionEnum = (Faction)System.Enum.Parse(typeof(Faction), loserName);
            var t = _game.State.Map.Territories.First(x => x.Name == territory);
            
            Assert.False(t.FactionForces.ContainsKey(factionEnum), $"{loserName} should have no forces in {territory}");
        }
    }
}
