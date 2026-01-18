using Moq;
using Xunit;
using DuneBot.Engine;
using DuneBot.Domain.Interfaces;
using DuneBot.Domain;
using DuneBot.Domain.State;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace DuneBot.Tests
{
    public class GameEngineTests
    {
        private readonly Mock<IGameRepository> _mockRepo;
        private readonly Mock<IDiscordService> _mockDiscord;
        private readonly Mock<IGameRenderer> _mockRenderer;
        private readonly Mock<IMapService> _mockMap; 
        private readonly Mock<IDeckService> _mockDecks; // New mock
        private readonly GameEngine _engine;

        public GameEngineTests()
        {
            _mockRepo = new Mock<IGameRepository>();
            _mockDiscord = new Mock<IDiscordService>();
            _mockRenderer = new Mock<IGameRenderer>();
            _mockMap = new Mock<IMapService>(); 
            _mockDecks = new Mock<IDeckService>(); // Init
            
            // Setup default deck returns
            _mockDecks.Setup(d => d.GetTreacheryDeck()).Returns(new List<string>());
            _mockDecks.Setup(d => d.GetSpiceDeck()).Returns(new List<string>());
            // Provide enough cards for 2 players (8 minimum)
            var dummyTraitors = new List<string> { "T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8", "T9" };
            _mockDecks.Setup(d => d.GetTraitorDeck()).Returns(dummyTraitors);
            _mockDecks.Setup(d => d.Draw(It.IsAny<List<string>>(), It.IsAny<List<string>>()))
                .Returns((List<string> deck, List<string> discard) => 
                {
                    if (deck.Count > 0) 
                    {
                        var c = deck[0];
                        deck.RemoveAt(0);
                        return c;
                    }
                    return null;
                });

            _engine = new GameEngine(_mockRepo.Object, _mockDiscord.Object, _mockRenderer.Object, _mockMap.Object, _mockDecks.Object);
        }

        [Fact]
        public async Task RegisterPlayer_ShouldAddPlayer_WhenGameIsOpen()
        {
            // Arrange
            var gameId = 1;
            var game = new Game { State = new GameState { Phase = GamePhase.Setup } };
            _mockRepo.Setup(r => r.GetGameAsync(gameId)).ReturnsAsync(game);

            // Act
            await _engine.RegisterPlayerAsync(gameId, 123, "TestUser");

            // Assert
            Assert.Single(game.State.Factions);
            Assert.Equal("TestUser", game.State.Factions[0].PlayerName);
            _mockRepo.Verify(r => r.UpdateGameAsync(game), Times.Once);
        }

        [Fact]
        public async Task RegisterPlayer_ShouldThrow_WhenGameStarted()
        {
            // Arrange
            var gameId = 1;
            var game = new Game { State = new GameState { Phase = GamePhase.Storm } };
            _mockRepo.Setup(r => r.GetGameAsync(gameId)).ReturnsAsync(game);

            // Act & Assert
            await Assert.ThrowsAsync<System.Exception>(() => _engine.RegisterPlayerAsync(gameId, 123, "TestUser"));
        }

        [Fact]
        public async Task StartGame_ShouldAssignFactions_AndSetToStorm()
        {
            // Arrange
            var gameId = 1;
            var game = new Game { State = new GameState { Phase = GamePhase.Setup } };
            game.State.Factions.Add(new FactionState { PlayerName = "P1" });
            game.State.Factions.Add(new FactionState { PlayerName = "P2" });
            
            _mockRepo.Setup(r => r.GetGameAsync(gameId)).ReturnsAsync(game);
            _mockMap.Setup(m => m.InitializeMap()).Returns(new MapState()); // Mock return

            // Act
            await _engine.StartGameAsync(gameId);

            // Assert
            Assert.Equal(GamePhase.Storm, game.State.Phase);
            Assert.Equal(1, game.State.Turn);
            Assert.DoesNotContain(game.State.Factions, f => f.Faction == Faction.None);
            Assert.All(game.State.Factions, f => Assert.Equal(4, f.Traitors.Count)); // Check Traitors
            Assert.NotNull(game.State.Map); 
            Assert.True(game.State.StormLocation >= 1 && game.State.StormLocation <= 18); 
            _mockRepo.Verify(r => r.UpdateGameAsync(game), Times.Once);
        }

        [Fact]
        public async Task AdvancePhase_ShouldIncrementTurn_WhenLoopingFromMentat()
        {
            // Arrange
            var gameId = 1;
            var game = new Game 
            { 
                State = new GameState 
                { 
                    Phase = GamePhase.MentatPause,
                    Turn = 1 
                } 
            };
            _mockRepo.Setup(r => r.GetGameAsync(gameId)).ReturnsAsync(game);

            // Act
            await _engine.AdvancePhaseAsync(gameId);

            // Assert
            Assert.Equal(GamePhase.Storm, game.State.Phase);
            Assert.Equal(2, game.State.Turn);
            _mockRepo.Verify(r => r.UpdateGameAsync(game), Times.Once);
        }

        [Fact]
        public async Task AdvancePhase_ShouldEndGame_AtEndOfRound10()
        {
            // Arrange
            var gameId = 1;
            var game = new Game 
            { 
                Id = gameId,
                GuildId = 999,
                CategoryId = 888,
                State = new GameState 
                { 
                    Phase = GamePhase.MentatPause,
                    Turn = 10 
                } 
            };
            _mockRepo.Setup(r => r.GetGameAsync(gameId)).ReturnsAsync(game);

            // Act
            await _engine.AdvancePhaseAsync(gameId);

            // Assert
            _mockDiscord.Verify(d => d.DeleteGameChannelsAsync(999, 888), Times.Once);
            _mockRepo.Verify(r => r.DeleteGameAsync(gameId), Times.Once);
        }
        [Fact]
        public async Task AdvancePhase_FromStorm_ShouldTriggerSpiceBlow_AndSkipNexus_WhenTerritoryDrawn()
        {
            // Arrange
            var gameId = 1;
            var game = new Game { State = new GameState { Phase = GamePhase.Storm, Turn = 1 } };
            // Add a territory to map
            game.State.Map.Territories.Add(new Territory { Name = "Arrakeen" });
            
            _mockRepo.Setup(r => r.GetGameAsync(gameId)).ReturnsAsync(game);
            
            // Mock Draw to return a territory
            _mockDecks.Setup(d => d.Draw(game.State.SpiceDeck, game.State.SpiceDiscard)).Returns("Arrakeen");

            // Act
            await _engine.AdvancePhaseAsync(gameId);

            // Assert
            Assert.Equal(GamePhase.ChoamCharity, game.State.Phase); // Skipped Nexus
            Assert.Contains("Spice Blow: Drawn **Arrakeen**.", game.State.ActionLog);
            _mockRepo.Verify(r => r.UpdateGameAsync(game), Times.Once);
        }

        [Fact]
        public async Task AdvancePhase_FromStorm_ShouldTriggerNexus_WhenShaiHuludDrawn()
        {
            // Arrange
            var gameId = 1;
            var game = new Game { State = new GameState { Phase = GamePhase.Storm, Turn = 1 } };
            _mockRepo.Setup(r => r.GetGameAsync(gameId)).ReturnsAsync(game);
            
            // Mock Draw to return Worm
            _mockDecks.Setup(d => d.Draw(game.State.SpiceDeck, game.State.SpiceDiscard)).Returns("Shai-Hulud");

            // Act
            await _engine.AdvancePhaseAsync(gameId);

            // Assert
            Assert.Equal(GamePhase.Nexus, game.State.Phase); 
            Assert.Contains("**NEXUS!** Alliances may be formed/broken.", game.State.ActionLog);
            _mockRepo.Verify(r => r.UpdateGameAsync(game), Times.Once);
        }
    }
}
