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
        [Fact]
        public async Task AdvancePhase_FromChoam_ShouldStartBidding_AndCreateThread()
        {
            // Arrange
            var gameId = 1;
            var game = new Game 
            { 
                GuildId = 100,
                ActionsChannelId = 200,
                State = new GameState { Phase = GamePhase.ChoamCharity } 
            };
            game.State.Factions.Add(new FactionState { PlayerDiscordId = 1, PlayerName = "P1" });
            
            _mockRepo.Setup(r => r.GetGameAsync(gameId)).ReturnsAsync(game);
            _mockDecks.Setup(d => d.Draw(It.IsAny<List<string>>(), It.IsAny<List<string>>())).Returns("Lasgun");
            _mockDiscord.Setup(d => d.CreatePhaseThreadAsync(100, 200, It.IsAny<string>())).ReturnsAsync(999ul);

            // Act
            await _engine.AdvancePhaseAsync(gameId);

            // Assert
            Assert.Equal(GamePhase.Bidding, game.State.Phase);
            Assert.Equal("Lasgun", game.State.BiddingCard);
            Assert.Equal(999ul, game.State.BiddingThreadId);
            Assert.True(game.State.IsBiddingRoundActive);
            _mockDiscord.Verify(d => d.CreatePhaseThreadAsync(100, 200, It.IsAny<string>()), Times.Once);
            _mockDiscord.Verify(d => d.SendThreadMessageAsync(100, 999ul, It.IsAny<string>()), Times.Once);
        }

        [Fact]
        public async Task PlaceBid_ShouldUpdateState_AndPostToThread()
        {
            // Arrange
            var gameId = 1;
            var game = new Game { GuildId = 100, State = new GameState 
            { 
                Phase = GamePhase.Bidding, 
                IsBiddingRoundActive = true,
                BiddingThreadId = 999ul,
                CurrentBidderId = 1,
                CurrentBid = 0
            }};
            game.State.Factions.Add(new FactionState { PlayerDiscordId = 1, PlayerName = "P1", Spice = 10 });
            game.State.Factions.Add(new FactionState { PlayerDiscordId = 2, PlayerName = "P2", Spice = 10 });
            
            _mockRepo.Setup(r => r.GetGameAsync(gameId)).ReturnsAsync(game);

            // Act
            await _engine.PlaceBidAsync(gameId, 1, 5);

            // Assert
            Assert.Equal(5, game.State.CurrentBid);
            Assert.Equal(1ul, game.State.HighBidderId);
            Assert.Equal(2ul, game.State.CurrentBidderId); // Rotated to P2
            _mockDiscord.Verify(d => d.SendThreadMessageAsync(100, 999ul, "**P1** bids **5**."), Times.Once);
        }

        [Fact]
        public async Task AdvancePhase_ChoamCharity_ShouldTopUpSpice()
        {
            // Arrange
            var gameId = 1;
            var game = new Game { State = new GameState { Phase = GamePhase.ChoamCharity } };
            // P1 has 0 -> gets 2
            game.State.Factions.Add(new FactionState { PlayerName = "P1", Spice = 0, Faction = Faction.Atreides });
            // P2 has 1 -> gets 1 (total 2)
            game.State.Factions.Add(new FactionState { PlayerName = "P2", Spice = 1, Faction = Faction.Harkonnen });
            // P3 has 2 -> gets 0
            game.State.Factions.Add(new FactionState { PlayerName = "P3", Spice = 2, Faction = Faction.Fremen });
            // P4 has 10 -> gets 0
            game.State.Factions.Add(new FactionState { PlayerName = "P4", Spice = 10, Faction = Faction.Emperor });

            _mockRepo.Setup(r => r.GetGameAsync(gameId)).ReturnsAsync(game);
            _mockDecks.Setup(d => d.Draw(It.IsAny<List<string>>(), It.IsAny<List<string>>())).Returns("Lasgun");
            _mockDiscord.Setup(d => d.CreatePhaseThreadAsync(It.IsAny<ulong>(), It.IsAny<ulong>(), It.IsAny<string>())).ReturnsAsync(111ul);

            // Act
            await _engine.AdvancePhaseAsync(gameId);

            // Assert
            Assert.Equal(2, game.State.Factions[0].Spice);
            Assert.Equal(2, game.State.Factions[1].Spice);
            Assert.Equal(2, game.State.Factions[2].Spice); // Unchanged
            Assert.Equal(10, game.State.Factions[3].Spice); // Unchanged
            
            Assert.Contains("**P1** received 2 spice from CHOAM Charity.", game.State.ActionLog);
            Assert.Contains("**P2** received 1 spice from CHOAM Charity.", game.State.ActionLog);
            Assert.DoesNotContain("**P3** received", game.State.ActionLog);
        }

        [Fact]
        public async Task ReviveForces_ShouldSucceed_WhenValid()
        {
            // Arrange
            var gameId = 1;
            var game = new Game { State = new GameState { Phase = GamePhase.Revival } };
            // P1 has 5 dead, 10 spice
            var faction = new FactionState 
            { 
                PlayerDiscordId = 1, 
                PlayerName = "P1", 
                ForcesInTanks = 5, 
                Spice = 10,
                Faction = Faction.Atreides
            };
            game.State.Factions.Add(faction);
            _mockRepo.Setup(r => r.GetGameAsync(gameId)).ReturnsAsync(game);

            // Act
            await _engine.ReviveForcesAsync(gameId, 1, 3); // Max allowed

            // Assert
            Assert.Equal(2, faction.ForcesInTanks); // 5 - 3
            Assert.Equal(3, faction.Reserves);
            Assert.Equal(4, faction.Spice); // 10 - (3 * 2)
            Assert.Equal(3, faction.RevivedTroopsThisTurn);
        }

        [Fact]
        public async Task ReviveForces_ShouldThrow_WhenLimitExceeded()
        {
            // Arrange
            var gameId = 1;
            var game = new Game { State = new GameState { Phase = GamePhase.Revival } };
            var faction = new FactionState 
            { 
                PlayerDiscordId = 1, 
                ForcesInTanks = 5, 
                Spice = 10 
            };
            game.State.Factions.Add(faction);
            _mockRepo.Setup(r => r.GetGameAsync(gameId)).ReturnsAsync(game);

            // Act & Assert
            await Assert.ThrowsAsync<System.Exception>(() => _engine.ReviveForcesAsync(gameId, 1, 4));
        }

        [Fact]
        public async Task ReviveLeader_ShouldSucceed_WhenLeaderIsDead()
        {
            // Arrange
            var gameId = 1;
            var game = new Game { State = new GameState { Phase = GamePhase.Revival } };
            var faction = new FactionState 
            { 
                PlayerDiscordId = 1, 
                Spice = 10,
                DeadLeaders = new List<string> { "Duncan Idaho" }
            };
            game.State.Factions.Add(faction);
            _mockRepo.Setup(r => r.GetGameAsync(gameId)).ReturnsAsync(game);

            // Act
            await _engine.ReviveLeaderAsync(gameId, 1, "Duncan Idaho");

            // Assert
            Assert.DoesNotContain("Duncan Idaho", faction.DeadLeaders);
            Assert.Equal(8, faction.Spice); // 10 - 2
            Assert.Equal(8, faction.Spice); // 10 - 2
        }

        [Fact]
        public async Task ShipForces_ShouldSucceed_WhenValid()
        {
            // Arrange
            var gameId = 1;
            var game = new Game { State = new GameState { Phase = GamePhase.ShipmentAndMovement, StormLocation = 18 } };
            // P1 has 10 reserves, 10 spice
            var faction = new FactionState 
            { 
                PlayerDiscordId = 1, 
                PlayerName = "P1", 
                Reserves = 10, 
                Spice = 10,
                Faction = Faction.Atreides
            };
            game.State.Factions.Add(faction);
            
            // Map with territory
            game.State.Map.Territories.Add(new Territory { Name = "Arrakeen", Sector = 1, IsStronghold = true });
            _mockRepo.Setup(r => r.GetGameAsync(gameId)).ReturnsAsync(game);

            // Act
            await _engine.ShipForcesAsync(gameId, 1, "Arrakeen", 2);

            // Assert
            Assert.Equal(8, faction.Reserves); // 10 - 2
            Assert.Equal(8, faction.Spice); // 10 - (2 * 1) [Stronghold cost 1]
            Assert.True(faction.HasShipped);
            var territory = game.State.Map.Territories.First(t => t.Name == "Arrakeen");
            Assert.Equal(2, territory.FactionForces[Faction.Atreides]);
        }

        [Fact]
        public async Task MoveForces_ShouldSucceed_WhenAdjacent()
        {
            // Arrange
            var gameId = 1;
            var game = new Game { State = new GameState { Phase = GamePhase.ShipmentAndMovement, StormLocation = 18 } };
            var faction = new FactionState 
            { 
                PlayerDiscordId = 1, 
                Faction = Faction.Harkonnen
            };
            game.State.Factions.Add(faction);
            
            // Valid setup: Forces in Arrakeen, moving to Basin
            var t1 = new Territory { Name = "Arrakeen", Sector = 1 };
            t1.FactionForces[Faction.Harkonnen] = 5;
            var t2 = new Territory { Name = "Imperial Basin (S2)", Sector = 2 };
            
            game.State.Map.Territories.Add(t1);
            game.State.Map.Territories.Add(t2);
            
            _mockRepo.Setup(r => r.GetGameAsync(gameId)).ReturnsAsync(game);
            // Mock Adjacency
            _mockMap.Setup(m => m.IsReachable("Arrakeen", "Imperial Basin (S2)", It.IsAny<int>())).Returns(true);

            // Act
            await _engine.MoveForcesAsync(gameId, 1, "Arrakeen", "Imperial Basin (S2)", 3);

            // Assert
            Assert.Equal(2, t1.FactionForces[Faction.Harkonnen]); // 5 - 3
            Assert.Equal(3, t2.FactionForces[Faction.Harkonnen]);
            Assert.True(faction.HasMoved);
        }


        [Fact]
        public async Task Battle_TraitorWin_ShouldEndBattleImmediately()
        {
            // Arrange
            var gameId = 1;
            var game = new Game { State = new GameState { Phase = GamePhase.Battle } };
            
            var f1 = new FactionState { PlayerDiscordId = 1, PlayerName = "Atreides", Faction = Faction.Atreides, Spice = 0 };
            f1.Traitors.Add("Baron Harkonnen");
            
            var f2 = new FactionState { PlayerDiscordId = 2, PlayerName = "Harkonnen", Faction = Faction.Harkonnen, Spice = 10 };
            
            game.State.Factions.Add(f1);
            game.State.Factions.Add(f2);
            
            var battle = new BattleState 
            { 
                TerritoryName = "Arrakeen", 
                Faction1Id = 1, 
                Faction2Id = 2, 
                IsActive = true 
            };
            game.State.CurrentBattle = battle;
            game.State.PendingBattles.Enqueue(battle); // Just to satisfy check if I used it logic.. wait I didn't use Pending check for logic
            
            // Map Setup
            var territory = new Territory { Name = "Arrakeen" };
            territory.FactionForces[Faction.Atreides] = 10;
            territory.FactionForces[Faction.Harkonnen] = 10;
            game.State.Map.Territories.Add(territory);

            _mockRepo.Setup(r => r.GetGameAsync(gameId)).ReturnsAsync(game);

            // Act
            // P1 commits
            await _engine.SubmitBattlePlanAsync(gameId, 1, "Paul Atreides", 5, null, null);
            // P2 commits with Traitor
            await _engine.SubmitBattlePlanAsync(gameId, 2, "Baron Harkonnen", 5, null, null);

            // Assert
            Assert.False(battle.IsActive);
            // F1 should win (Has P2's leader as traitor)
            Assert.Equal(5, f1.Spice); // Leader strength
            Assert.DoesNotContain(Faction.Harkonnen, territory.FactionForces.Keys); // F2 wiped
            Assert.Equal(10, territory.FactionForces[Faction.Atreides]); // F1 no loss
        }

        [Fact]
        public async Task SpiceCollection_ShouldCollectCorrectAmount()
        {
             // Arrange
            var gameId = 1;
            var game = new Game { State = new GameState { Phase = GamePhase.SpiceCollection, Turn = 1 } };
            
            var f1 = new FactionState { PlayerDiscordId = 1, PlayerName = "Atreides", Faction = Faction.Atreides, Spice = 0 };
            game.State.Factions.Add(f1);
            
            // Map Setup
            var t1 = new Territory { Name = "The Great Flat", SpiceBlowAmount = 10 };
            t1.FactionForces[Faction.Atreides] = 3; // 3 * 2 = 6 collection
            game.State.Map.Territories.Add(t1);

            _mockRepo.Setup(r => r.GetGameAsync(gameId)).ReturnsAsync(game);

            // Act
            await _engine.AdvancePhaseAsync(gameId);

            // Assert
            Assert.Equal(6, f1.Spice);
            Assert.Equal(4, t1.SpiceBlowAmount); // 10 - 6 = 4
            Assert.Equal(GamePhase.MentatPause, game.State.Phase);
        }

        [Fact]
        public async Task WinCondition_ThreeStrongholds_ShouldEndGame()
        {
             // Arrange
            var gameId = 1;
            var game = new Game { Id = gameId, State = new GameState { Phase = GamePhase.MentatPause, Turn = 1 } };
            
            var f1 = new FactionState { PlayerDiscordId = 1, PlayerName = "Atreides", Faction = Faction.Atreides };
            game.State.Factions.Add(f1);
            
            // Map Setup: Give 3 Strongholds
            var s1 = new Territory { Name = "Arrakeen", IsStronghold = true }; s1.FactionForces[Faction.Atreides] = 1;
            var s2 = new Territory { Name = "Carthag", IsStronghold = true }; s2.FactionForces[Faction.Atreides] = 1;
            var s3 = new Territory { Name = "Sietch Tabr", IsStronghold = true }; s3.FactionForces[Faction.Atreides] = 1;
            
            game.State.Map.Territories.Add(s1);
            game.State.Map.Territories.Add(s2);
            game.State.Map.Territories.Add(s3);

            _mockRepo.Setup(r => r.GetGameAsync(gameId)).ReturnsAsync(game);
            _mockRepo.Setup(r => r.DeleteGameAsync(gameId)).Returns(Task.CompletedTask).Verifiable();

            // Act
            await _engine.AdvancePhaseAsync(gameId);

            // Assert
            _mockRepo.Verify(r => r.DeleteGameAsync(gameId), Times.Once); // Game Deleted = Win
        }
    }
}
