using DuneBot.Domain;
using DuneBot.Domain.State;
using DuneBot.Engine;
using DuneBot.Domain.Interfaces;
using Moq;

namespace DuneBot.Specs.Steps
{
    public class GameContext
    {
        public Game Game { get; set; }
        public GameEngine Engine { get; set; }
        public Mock<IGameRepository> MockRepo { get; set; }
        public Mock<IDiscordService> MockDiscord { get; set; }
        public Mock<IGameRenderer> MockRenderer { get; set; }
        public Mock<IDeckService> MockDeck { get; set; }
        public DuneBot.Engine.Services.MapService MapService { get; set; }
        public DuneBot.Domain.Interfaces.IBiddingService BiddingService { get; set; }
        public DuneBot.Domain.Interfaces.IBattleService BattleService { get; set; }

        public GameContext()
        {
            MockRepo = new Mock<IGameRepository>();
            MockDiscord = new Mock<IDiscordService>();
            MockRenderer = new Mock<IGameRenderer>();
            MockDeck = new Mock<IDeckService>();
            MapService = new DuneBot.Engine.Services.MapService();

             // Services
            var messageService = new DuneBot.Engine.Services.GameMessageService();
            var spiceService = new DuneBot.Engine.Services.SpiceService(MockDeck.Object, messageService);
            BattleService = new DuneBot.Engine.Services.BattleService(MockDiscord.Object, MockRepo.Object, messageService);
            BiddingService = new DuneBot.Engine.Services.BiddingService(MockDiscord.Object, MockRepo.Object, MockDeck.Object, messageService);
            var movementService = new DuneBot.Engine.Services.MovementService(MockRepo.Object, MapService, messageService);
            var revivalService = new DuneBot.Engine.Services.RevivalService(MockRepo.Object, messageService);
            var setupService = new DuneBot.Engine.Services.GameSetupService(MockRepo.Object, MockDiscord.Object, MapService, MockDeck.Object, messageService, MockRenderer.Object);
            
            var handlers = new System.Collections.Generic.List<IGamePhaseHandler>
            {
                new DuneBot.Engine.Phases.SetupPhaseHandler(),
                new DuneBot.Engine.Phases.StormPhaseHandler(spiceService, BattleService, MapService),
                new DuneBot.Engine.Phases.SpiceBlowPhaseHandler(messageService),
                new DuneBot.Engine.Phases.NexusPhaseHandler(messageService),
                new DuneBot.Engine.Phases.ChoamCharityPhaseHandler(BiddingService, messageService),
                new DuneBot.Engine.Phases.BiddingPhaseHandler(revivalService, BiddingService),
                new DuneBot.Engine.Phases.RevivalPhaseHandler(movementService),
                new DuneBot.Engine.Phases.ShipmentPhaseHandler(BattleService),
                new DuneBot.Engine.Phases.BattlePhaseHandler(BattleService),
                new DuneBot.Engine.Phases.SpiceCollectionPhaseHandler(spiceService),
                new DuneBot.Engine.Phases.MentatPausePhaseHandler(MapService, BattleService, messageService)
            };

            var phaseManager = new DuneBot.Engine.Phases.PhaseManager(handlers, MockRepo.Object, MockRenderer.Object, MockDiscord.Object);

            Engine = new GameEngine(MockRepo.Object, BattleService, BiddingService, movementService, revivalService, setupService, phaseManager, messageService);

            Game = new Game
            {
                State = new GameState
                {
                    Turn = 1,
                    // Default phase, can be overwritten
                    Phase = GamePhase.Setup
                }
            };

            // Initialize Map
            Game.State.Map = MapService.InitializeMap();

            // Setup default mock for DeckService.Draw to simulate drawing from decks
            MockDeck.Setup(d => d.Draw(It.IsAny<System.Collections.Generic.List<string>>(),
                    It.IsAny<System.Collections.Generic.List<string>>()))
                .Returns((System.Collections.Generic.List<string> deck,
                    System.Collections.Generic.List<string> discard) =>
                {
                    if (deck.Count == 0) return (string?)null;
                    var card = deck[0];
                    deck.RemoveAt(0);
                    return card;
                });

            MockRepo.Setup(r => r.GetGameAsync(It.IsAny<int>())).ReturnsAsync(Game);
            MockRepo.Setup(r => r.UpdateGameAsync(It.IsAny<Game>())).Returns(System.Threading.Tasks.Task.CompletedTask);
        }
    }
}
