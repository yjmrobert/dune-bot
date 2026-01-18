using Xunit;
using Microsoft.EntityFrameworkCore;
using DuneBot.Data;
using DuneBot.Data.Repositories;
using DuneBot.Domain;
using DuneBot.Domain.State;
using System.Threading.Tasks;

namespace DuneBot.Tests
{
    public class GameRepositoryTests
    {
        private DbContextOptions<DuneDbContext> CreateNewContextOptions()
        {
            return new DbContextOptionsBuilder<DuneDbContext>()
                .UseInMemoryDatabase(databaseName: "DuneBotTestDb_" + System.Guid.NewGuid()) // Unique DB per test
                .Options;
        }

        [Fact]
        public async Task CreateGame_ShouldSaveToDatabase()
        {
            var options = CreateNewContextOptions();
            using var context = new DuneDbContext(options);
            var repo = new GameRepository(context);

            var game = new Game 
            { 
                GuildId = 1, 
                State = new GameState { Phase = GamePhase.Setup } 
            };

            await repo.CreateGameAsync(game);

            using (var verifyContext = new DuneDbContext(options))
            {
                var verifyRepo = new GameRepository(verifyContext);
                var savedGame = await verifyRepo.GetGameAsync(1); // Assumes ID 1
                
                Assert.NotNull(savedGame);
                Assert.Equal(1ul, savedGame.GuildId);
                Assert.Equal(GamePhase.Setup, savedGame.State.Phase);
            }
        }

        [Fact]
        public async Task UpdateGame_ShouldPersistChanges()
        {
            var options = CreateNewContextOptions();
            // Seed
            using (var context = new DuneDbContext(options))
            {
                var repo = new GameRepository(context);
                var game = new Game { State = new GameState { Turn = 1 } };
                await repo.CreateGameAsync(game);
            }

            // Update
            using (var context = new DuneDbContext(options))
            {
                var repo = new GameRepository(context);
                var game = await repo.GetGameAsync(1);
                game.State.Turn = 2;
                await repo.UpdateGameAsync(game);
            }

            // Verify
            using (var context = new DuneDbContext(options))
            {
                var repo = new GameRepository(context);
                var savedGame = await repo.GetGameAsync(1);
                Assert.Equal(2, savedGame.State.Turn);
            }
        }

        [Fact]
        public async Task DeleteGame_ShouldRemoveRow()
        {
            var options = CreateNewContextOptions();
            using (var context = new DuneDbContext(options))
            {
                var repo = new GameRepository(context);
                var game = new Game { Id = 1, State = new GameState() };
                await repo.CreateGameAsync(game);
            }

            using (var context = new DuneDbContext(options))
            {
                var repo = new GameRepository(context);
                await repo.DeleteGameAsync(1);
            }

            using (var context = new DuneDbContext(options))
            {
                Assert.Empty(context.Games);
            }
        }
    }
}
