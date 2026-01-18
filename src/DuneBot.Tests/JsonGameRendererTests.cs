using Xunit;
using DuneBot.Renderer;
using DuneBot.Domain.State;

namespace DuneBot.Tests
{
    public class JsonGameRendererTests
    {
        private readonly JsonGameRenderer _renderer;

        public JsonGameRendererTests()
        {
            _renderer = new JsonGameRenderer();
        }

        [Fact]
        public void Render_ShouldReturnFormattedJson()
        {
            // Arrange
            var state = new GameState 
            { 
                Turn = 5,
                Phase = DuneBot.Domain.GamePhase.Battle 
            };
            state.Factions.Add(new FactionState 
            { 
                Faction = DuneBot.Domain.Faction.Atreides, 
                PlayerName = "Paul" 
            });

            // Act
            var output = _renderer.Render(state);

            // Assert
            Assert.Contains("```json", output);
            Assert.Contains("\"Turn\": 5", output);
            Assert.Contains("\"Phase\": \"Battle\"", output);
            Assert.Contains("\"PlayerName\": \"Paul\"", output);
        }
    }
}
