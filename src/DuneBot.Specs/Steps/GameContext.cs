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
        public DuneBot.Engine.Services.GameSetupService SetupService { get; set; } 
        public DuneBot.Engine.Services.SpiceService SpiceService { get; set; } 

        public GameContext()
        {
            MockRepo = new Mock<IGameRepository>();
            MockDiscord = new Mock<IDiscordService>();
            MockRenderer = new Mock<IGameRenderer>();
            MockDeck = new Mock<IDeckService>();
            MapService = new DuneBot.Engine.Services.MapService();

             // Services
            var messageService = new DuneBot.Engine.Services.GameMessageService();
            SpiceService = new DuneBot.Engine.Services.SpiceService(MockDeck.Object, messageService);
            BattleService = new DuneBot.Engine.Services.BattleService(MockDiscord.Object, MockRepo.Object, messageService);
            BiddingService = new DuneBot.Engine.Services.BiddingService(MockDiscord.Object, MockRepo.Object, MockDeck.Object, messageService);
            var movementService = new DuneBot.Engine.Services.MovementService(MockRepo.Object, MapService, messageService);
            var revivalService = new DuneBot.Engine.Services.RevivalService(MockRepo.Object, messageService);
            SetupService = new DuneBot.Engine.Services.GameSetupService(MockRepo.Object, MockDiscord.Object, MapService, MockDeck.Object, messageService, MockRenderer.Object);
            
            var handlers = new System.Collections.Generic.List<IGamePhaseHandler>
            {
                new DuneBot.Engine.Phases.SetupPhaseHandler(),
                new DuneBot.Engine.Phases.StormPhaseHandler(SpiceService, BattleService, MapService),
                new DuneBot.Engine.Phases.SpiceBlowPhaseHandler(messageService),
                new DuneBot.Engine.Phases.NexusPhaseHandler(messageService),
                new DuneBot.Engine.Phases.ChoamCharityPhaseHandler(BiddingService, messageService),
                new DuneBot.Engine.Phases.BiddingPhaseHandler(revivalService, BiddingService),
                new DuneBot.Engine.Phases.RevivalPhaseHandler(movementService),
                new DuneBot.Engine.Phases.ShipmentPhaseHandler(BattleService),
                new DuneBot.Engine.Phases.BattlePhaseHandler(BattleService),
                new DuneBot.Engine.Phases.SpiceCollectionPhaseHandler(SpiceService),
                new DuneBot.Engine.Phases.MentatPausePhaseHandler(MapService, BattleService, messageService)
            };

            var phaseManager = new DuneBot.Engine.Phases.PhaseManager(handlers, MockRepo.Object, MockRenderer.Object, MockDiscord.Object);

            Engine = new GameEngine(MockRepo.Object, BattleService, BiddingService, movementService, revivalService, SetupService, phaseManager, messageService);

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
                    if (deck != null && deck.Count > 0) 
                    {
                        var card = deck[0];
                        deck.RemoveAt(0);
                        return card;
                    }
                    return null;
                });
            
            // Mock deck getters
            MockDeck.Setup(d => d.GetTreacheryDeck()).Returns(new System.Collections.Generic.List<string> { "La", "Ka", "Shield", "Hunter" });
            MockDeck.Setup(d => d.GetSpiceDeck()).Returns(new System.Collections.Generic.List<string> { "S1", "S2" });
            MockDeck.Setup(d => d.GetTraitorDeck()).Returns(new System.Collections.Generic.List<string> { "T1", "T2", "T3", "T4", "T5", "T6" });

            MockRepo.Setup(r => r.GetGameAsync(It.IsAny<int>())).ReturnsAsync(Game);
            MockRepo.Setup(r => r.UpdateGameAsync(It.IsAny<Game>())).Returns(System.Threading.Tasks.Task.CompletedTask);
        }
    }
}
