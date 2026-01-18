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
            Assert.All(game.State.Factions, f => 
            {
                if (f.Faction == Faction.Harkonnen) Assert.Equal(4, f.Traitors.Count);
                else Assert.Equal(1, f.Traitors.Count);
            });
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
            // Assert
            _mockRepo.Verify(r => r.DeleteGameAsync(gameId), Times.Once); // Game Deleted = Win
        }

        [Fact]
        public async Task StartBidding_ShouldNotifyAtreides()
        {
             // Arrange
            var gameId = 1;
            var game = new Game { 
                GuildId = 123,
                State = new GameState { Phase = GamePhase.ChoamCharity } // Will transition to Bidding
            };
            
            var f1 = new FactionState { PlayerDiscordId = 10, PlayerName = "Atreides", Faction = Faction.Atreides };
            game.State.Factions.Add(f1);
            
            _mockRepo.Setup(r => r.GetGameAsync(gameId)).ReturnsAsync(game);
            _mockDecks.Setup(d => d.Draw(It.IsAny<List<string>>(), It.IsAny<List<string>>())).Returns("Lasgun");
            _mockDiscord.Setup(d => d.CreatePhaseThreadAsync(123, 0, It.IsAny<string>())).ReturnsAsync((ulong)999);

            // Act
            // Advance Phase from Choam -> Bidding
            await _engine.AdvancePhaseAsync(gameId);

            // Assert
            _mockDiscord.Verify(d => d.SendDirectMessageAsync(10, It.Is<string>(s => s.Contains("Lasgun"))), Times.Once);
        }

        [Fact]
        public async Task StartGame_ShouldGiveHarkonnenFourTraitors()
        {
            // Arrange
            var gameId = 1;
            var game = new Game { State = new GameState { Phase = GamePhase.Setup } };
            // Add Harkonnen and Atreides
            game.State.Factions.Add(new FactionState { PlayerDiscordId = 1, Faction = Faction.Atreides }); // Will be shuffled, so we can't guarantee who is who?
            // Wait, StartGame shuffles factions.
            // Setup() in test constructor mocks decks but StartGame calls:
            // 1. Shuffle Factions
            // 2. Assign Factions
            
            // To test specific outcome, we mock the Shuffle? Or inspect state after.
            // Since we add 2 players, one will be Harkonnen, one something else (if we control available factions).
            // StartGame logic:
            // var availableFactions = Enum.GetValues<Faction>()... .OrderBy(Guid).Take(count)
            
            // This is non-deterministic.
            // However, after StartGame, we can check "Find Harkonnen -> Count Traitors".
            // Problem: If Harkonnen is not picked (random 2 from 6), test fails.
            
            // Refactor needed: StartGame logic or Test logic.
            // For this test, I'll rely on checking *IF* Harkonnen is present, count is 4.
            // But I can't guarantee Harkonnen presence without mocking Random or refustering.
            
            // ALTERNATIVE: Use checking logic on "Whatever" faction got Harkonnen. 
            // Better: Force assignment? No, hardcoded in StartGame.
            
            // Let's modify the test to just run StartGame and assert property on specific faction IF it exists.
            // To guarantee existence, I'd need to mock Enum.GetValues? Impossible.
            // Wait, if I supply 6 players, ALL factions are assigned. 
            // So: Add 6 dummy players.
            
            for(int i=2; i<=6; i++) game.State.Factions.Add(new FactionState { PlayerDiscordId = (ulong)i, PlayerName = $"P{i}" });
            
            _mockRepo.Setup(r => r.GetGameAsync(gameId)).ReturnsAsync(game);
            _mockMap.Setup(m => m.InitializeMap()).Returns(new MapState());
            
            // Act
            await _engine.StartGameAsync(gameId);
            
            // Assert
            var harkonnen = game.State.Factions.First(f => f.Faction == Faction.Harkonnen);
            var atreides = game.State.Factions.First(f => f.Faction == Faction.Atreides);
            
            Assert.Equal(4, harkonnen.Traitors.Count);
            Assert.Equal(1, atreides.Traitors.Count);
        }

        [Fact]
        public async Task ResolveAuction_ShouldPayEmperor_WhenOtherWins()
        {
             // Arrange
            var gameId = 1;
            var game = new Game { 
                State = new GameState { 
                    Phase = GamePhase.Bidding,
                    IsBiddingRoundActive = true,
                    BiddingCard = "Lasgun",
                    CurrentBid = 5,
                    HighBidderId = 1, // Atreides
                    CurrentBidderId = 1 // Atreides passing/winning
                } 
            };
            
            var f1 = new FactionState { PlayerDiscordId = 1, PlayerName = "Atreides", Faction = Faction.Atreides, Spice = 10 };
            var f2 = new FactionState { PlayerDiscordId = 2, PlayerName = "Emperor", Faction = Faction.Emperor, Spice = 0 };
            
            game.State.Factions.Add(f1);
            game.State.Factions.Add(f2);
            
            _mockRepo.Setup(r => r.GetGameAsync(gameId)).ReturnsAsync(game);

            // Act
            // Trigger Pass -> Logic checks winner -> calls ResolveAuctionWin
            // We need to trigger winning condition. 
            // PassBidAsync checks if HighBidder == CurrentBidder? No, that logic is:
            // if (game.State.HighBidderId.HasValue && game.State.CurrentBidderId == game.State.HighBidderId)
            // Wait, if it's my turn and I am the high bidder, I can't pass (I already bid).
            // Usually, bidding continues until everyone ELSE passes.
            // If I am high bidder, and it becomes my turn again (because everyone else passed), THEN I win.
            // So logic in PassBidAsync at line 376 is:
            // if (game.State.HighBidderId.HasValue && game.State.CurrentBidderId == game.State.HighBidderId) -> Win
            
            // So if Atreides (High Bidder) gets the turn, they win.
            // We can call PassBidAsync(Atreides)? No, if I Pass, I assume I'm out.
            // But if I am high bidder, I shouldn't pass.
            // Logic check: "bidding is done... when the bid returns to the high bidder."
            // So AdvanceBidder should happen, then Check.
            // If it returns to HighBidder, they win immediately without action? 
            // My implementation in PassBidAsync line 376 handles this AFTER a pass:
            // 1. Player X passes.
            // 2. AdvanceBidder(game) -> Sets Current to Next.
            // 3. IF Current == HighBidder -> ResolveWin.
            
            // So: H=Atreides. Current=Harkonnen. Harkonnen Passes. Advance -> Atreides. Check -> Atreides Wins.
            
            // Setup: H=Atreides, Current=Emperor. Emperor Passes. Advance -> Atreides. Win.
            game.State.CurrentBidderId = 2; // Emperor's turn to pass
            
            await _engine.PassBidAsync(gameId, 2);

            // Assert
            Assert.Equal(5, f1.Spice); // Paid 5 (10-5)
            Assert.Equal(5, f2.Spice); // Received 5 (0+5)
            Assert.Contains("Lasgun", f1.TreacheryCards);
        }

        [Fact]
        public async Task ShipForces_ShouldApplyGuildRules()
        {
             // Arrange
            var gameId = 1;
            var game = new Game { 
                State = new GameState { 
                    Phase = GamePhase.ShipmentAndMovement,
                    StormLocation = 5
                } 
            };
            
            var f1 = new FactionState { PlayerDiscordId = 1, PlayerName = "Atreides", Faction = Faction.Atreides, Spice = 10, Reserves = 10 };
            var f2 = new FactionState { PlayerDiscordId = 2, PlayerName = "Guild", Faction = Faction.Guild, Spice = 10, Reserves = 10 };
            
            game.State.Factions.Add(f1);
            game.State.Factions.Add(f2);
            
            // Map
            var t1 = new Territory { Name = "Arrakeen", IsStronghold = true, Sector = 1 };
            game.State.Map.Territories.Add(t1);
            
            _mockRepo.Setup(r => r.GetGameAsync(gameId)).ReturnsAsync(game);

            // Act 1: Guild Ships to Stronghold (1 spice/force)
            // Cost: 6 forces * 1 = 6. Half = 3.
            await _engine.ShipForcesAsync(gameId, 2, "Arrakeen", 6);
            
            // Assert 1
            Assert.Equal(7, f2.Spice); // 10 - 3 = 7
            Assert.Equal(6, t1.FactionForces[Faction.Guild]);

            // Act 2: Atreides Ships to Stronghold
            // Cost: 2 forces * 1 = 2.
            await _engine.ShipForcesAsync(gameId, 1, "Arrakeen", 2);
            
            // Assert 2
            Assert.Equal(8, f1.Spice); // 10 - 2 = 8
            Assert.Equal(9, f2.Spice); // 7 + 2 = 9 (Income)
            Assert.Equal(2, t1.FactionForces[Faction.Atreides]);
        }

        [Fact]
        public async Task Voice_ShouldPreventAction()
        {
             // Arrange
            var gameId = 1;
            var game = new Game { 
                State = new GameState { 
                    Phase = GamePhase.Battle,
                    CurrentBattle = new BattleState { 
                        IsActive = true,
                        TerritoryName = "Arrakeen",
                        Faction1Id = 1, // BG
                        Faction2Id = 2 // Harkonnen
                    }
                } 
            };
            
            var f1 = new FactionState { PlayerDiscordId = 1, PlayerName = "BG", Faction = Faction.BeneGesserit };
            var f2 = new FactionState { PlayerDiscordId = 2, PlayerName = "Harko", Faction = Faction.Harkonnen, DeadLeaders = new List<string>(), TreacheryCards = new List<string> { "Lasgun" } };
            
            game.State.Factions.Add(f1);
            game.State.Factions.Add(f2);
            game.State.Map.Territories.Add(new Territory { Name = "Arrakeen", FactionForces = new Dictionary<Faction, int> { { Faction.Harkonnen, 5 } } });
            
            _mockRepo.Setup(r => r.GetGameAsync(gameId)).ReturnsAsync(game);

            // Act 1: Use Voice to forbid Weapon
            await _engine.UseVoiceAsync(gameId, 1, 2, "Weapon", false); // Must NOT play Weapon
            
            // Act 2: Harkonnen tries to play Weapon
            var ex = await Assert.ThrowsAsync<Exception>(async () => 
                await _engine.SubmitBattlePlanAsync(gameId, 2, "AnyLeader", 1, "Lasgun", null));
                
            // Assert
            Assert.Contains("Voice forbids", ex.Message);
        }

        [Fact]
        public async Task Prescience_ShouldRevealOpponentPlan()
        {
             // Arrange
            var gameId = 1;
            var game = new Game { 
                State = new GameState { 
                    Phase = GamePhase.Battle,
                    CurrentBattle = new BattleState { 
                        IsActive = true,
                        TerritoryName = "Arrakeen",
                        Faction1Id = 1, // Atreides
                        Faction2Id = 2 // Harkonnen
                    }
                } 
            };
            
            var f1 = new FactionState { PlayerDiscordId = 1, PlayerName = "Atreides", Faction = Faction.Atreides };
            var f2 = new FactionState { PlayerDiscordId = 2, PlayerName = "Harkonnen", Faction = Faction.Harkonnen, TreacheryCards = new List<string> { "Lasgun" } };
            
            game.State.Factions.Add(f1);
            game.State.Factions.Add(f2);
            game.State.Map.Territories.Add(new Territory { Name = "Arrakeen", FactionForces = new Dictionary<Faction, int> { { Faction.Harkonnen, 5 } } });
            
            _mockRepo.Setup(r => r.GetGameAsync(gameId)).ReturnsAsync(game);

            // Act 1: Use Prescience requesting "Weapon"
            await _engine.UsePrescienceAsync(gameId, 1, "Weapon");
            
            // Act 2: Harkonnen submits plan
            await _engine.SubmitBattlePlanAsync(gameId, 2, "Pilot", 1, "Lasgun", null);
            
            // Assert
            _mockDiscord.Verify(d => d.SendDirectMessageAsync(1, It.Is<string>(s => s.Contains("Lasgun"))), Times.Once);
        }

        [Fact]
        public async Task Harkonnen_ShouldCaptureLeader_IfWinner()
        {
             // Arrange
            var gameId = 1;
            var game = new Game { 
                State = new GameState { 
                    Phase = GamePhase.Battle,
                    CurrentBattle = new BattleState { 
                        IsActive = true,
                        TerritoryName = "Arrakeen",
                        Faction1Id = 1, // Harkonnen
                        Faction2Id = 2 // Atreides
                    }
                } 
            };
            
            var f1 = new FactionState { PlayerDiscordId = 1, PlayerName = "Harkonnen", Faction = Faction.Harkonnen };
            var f2 = new FactionState { PlayerDiscordId = 2, PlayerName = "Atreides", Faction = Faction.Atreides }; // Leader "Duncan" assumed valid
            
            game.State.Factions.Add(f1);
            game.State.Factions.Add(f2);
            game.State.Map.Territories.Add(new Territory { Name = "Arrakeen", FactionForces = new Dictionary<Faction, int> { { Faction.Harkonnen, 5 }, { Faction.Atreides, 5 } } });
            
            _mockRepo.Setup(r => r.GetGameAsync(gameId)).ReturnsAsync(game);

            // Act: Submit Plans
            // Harkonnen: 5 strength (Dial 0 + Leader 5) -> Wins if Atreides 0
            // Atreides: 0 strength (Dial 0 + Leader Duncan 5) -> Tie?
            // Need Harkonnen to win. Leader strength 5. 
            // Tie = Both lose.
            // Let's give Harkonnen a weapon to kill leader? No, we want capture (alive).
            // So Harkonnen Dial 5 + Leader 5 = 10. Atreides Dial 1 + Leader 5 = 6.
            
            await _engine.SubmitBattlePlanAsync(gameId, 1, "Beast", 5, null, null);
            await _engine.SubmitBattlePlanAsync(gameId, 2, "Duncan", 1, null, null);
            
            // Assert
            var harkonnen = game.State.Factions.First(f => f.Faction == Faction.Harkonnen);
            Assert.Contains("Duncan", harkonnen.CapturedLeaders);
            
            // Verify validation prevents reuse
             game.State.CurrentBattle.IsActive = true; // reactivate for test
             var ex = await Assert.ThrowsAsync<Exception>(async () => 
                await _engine.SubmitBattlePlanAsync(gameId, 2, "Duncan", 1, null, null));
             Assert.Contains("captured", ex.Message);
        }
    }
}
