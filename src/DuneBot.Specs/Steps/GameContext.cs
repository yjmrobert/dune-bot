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

        public GameContext()
        {
            MockRepo = new Mock<IGameRepository>();
            MockDiscord = new Mock<IDiscordService>();
            MockRenderer = new Mock<IGameRenderer>();
            MockDeck = new Mock<IDeckService>();
            MapService = new DuneBot.Engine.Services.MapService();

            Engine = new GameEngine(MockRepo.Object, MockDiscord.Object, MockRenderer.Object, MapService, MockDeck.Object);
            
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
            MockDeck.Setup(d => d.Draw(It.IsAny<System.Collections.Generic.List<string>>(), It.IsAny<System.Collections.Generic.List<string>>()))
                    .Returns((System.Collections.Generic.List<string> deck, System.Collections.Generic.List<string> discard) => 
                    {
                        if (deck.Count == 0) return null;
                        var card = deck[0];
                        deck.RemoveAt(0);
                        return card;
                    });
            
            MockRepo.Setup(r => r.GetGameAsync(It.IsAny<int>())).ReturnsAsync(Game);
            MockRepo.Setup(r => r.UpdateGameAsync(It.IsAny<Game>())).Returns(System.Threading.Tasks.Task.CompletedTask);
        }
    }
}
