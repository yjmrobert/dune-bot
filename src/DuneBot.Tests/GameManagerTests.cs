using Moq;
using Xunit;
using DuneBot.Engine.Services;
using DuneBot.Domain.Interfaces;
using DuneBot.Domain;
using System.Threading.Tasks;

namespace DuneBot.Tests
{
    public class GameManagerTests
    {
        private readonly Mock<IGameRepository> _mockRepo;
        private readonly Mock<IDiscordService> _mockDiscord;
        private readonly GameManager _manager;

        public GameManagerTests()
        {
            _mockRepo = new Mock<IGameRepository>();
            _mockDiscord = new Mock<IDiscordService>();
            _manager = new GameManager(_mockRepo.Object, _mockDiscord.Object);
        }

        [Fact]
        public async Task CreateGame_ShouldCallDiscordAndRepo()
        {
            // Arrange
            var guildId = 123ul;
            var name = "Test Game";
            
            // Mock Repo creating game and assigning ID = 1
            _mockRepo.Setup(r => r.CreateGameAsync(It.IsAny<Game>()))
                .Callback<Game>(g => g.Id = 1) 
                .Returns<Game>(g => Task.FromResult(g));

            // Mock Discord call expecting gameId = 1
            _mockDiscord.Setup(d => d.CreateGameChannelsAsync(guildId, 1, name))
                .ReturnsAsync((1ul, 2ul, 3ul, 4ul));

            // Act
            var game = await _manager.CreateGameAsync(guildId, name);

            // Assert
            Assert.Equal(guildId, game.GuildId);
            Assert.Equal(1ul, game.CategoryId);
            Assert.Equal(2ul, game.ActionsChannelId);

            // Verify Flow: Create -> CreateChannels -> Update -> SendMessage
            _mockRepo.Verify(r => r.CreateGameAsync(It.IsAny<Game>()), Times.Once); // First call
            _mockDiscord.Verify(d => d.CreateGameChannelsAsync(guildId, 1, name), Times.Once); // Second call
            _mockRepo.Verify(r => r.UpdateGameAsync(game), Times.Once); // Third call to save channel IDs
            _mockDiscord.Verify(d => d.SendActionMessageAsync(guildId, 2, It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()), Times.Once);
        }

        [Fact]
        public async Task DeleteGame_ShouldDeleteChannelsAndFromRepo()
        {
            // Arrange
            var gameId = 1;
            var game = new Game { Id = gameId, GuildId = 555, CategoryId = 666 };
            _mockRepo.Setup(r => r.GetGameAsync(gameId)).ReturnsAsync(game);

            // Act
            await _manager.DeleteGameAsync(gameId);

            // Assert
            _mockDiscord.Verify(d => d.DeleteGameChannelsAsync(555, 666), Times.Once);
            _mockRepo.Verify(r => r.DeleteGameAsync(gameId), Times.Once);
        }
    }
}
