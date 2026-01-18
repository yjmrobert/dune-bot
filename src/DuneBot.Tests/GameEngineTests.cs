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
        private readonly GameEngine _engine;

        public GameEngineTests()
        {
            _mockRepo = new Mock<IGameRepository>();
            _mockDiscord = new Mock<IDiscordService>();
            _mockRenderer = new Mock<IGameRenderer>();
            _engine = new GameEngine(_mockRepo.Object, _mockDiscord.Object, _mockRenderer.Object);
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

            // Act
            await _engine.StartGameAsync(gameId);

            // Assert
            Assert.Equal(GamePhase.Storm, game.State.Phase);
            Assert.Equal(1, game.State.Turn);
            Assert.DoesNotContain(game.State.Factions, f => f.Faction == Faction.None);
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
    }
}
