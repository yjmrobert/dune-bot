using System;
using System.Linq;
using System.Threading.Tasks;
using DuneBot.Domain;
using DuneBot.Domain.State;
using Moq;
using Reqnroll;
using Xunit;

namespace DuneBot.Specs.Steps;

[Binding]
public class GameSetupSteps
{
    private readonly GameContext _context;
    private readonly ScenarioContext _scenarioContext;

    public GameSetupSteps(GameContext context, ScenarioContext scenarioContext)
    {
        _context = context;
        _scenarioContext = scenarioContext;
    }

    private Game _game => _context.Game;

    [Given(@"a new game is created with ID (.*)")]
    public void GivenANewGameIsCreatedWithID(int id)
    {
        _game.Id = id;
        _game.State = new GameState { Phase = GamePhase.Setup };
         _context.SetupService = new DuneBot.Engine.Services.GameSetupService(
            _context.MockRepo.Object, 
            _context.MockDiscord.Object, 
            _context.MapService, 
            _context.MockDeck.Object, 
            new DuneBot.Engine.Services.GameMessageService(), 
            _context.MockRenderer.Object);
    }

    [When(@"player ""(.*)"" joins game (.*)")]
    public async Task WhenPlayerJoinsGame(string playerName, int gameId)
    {
        ulong userId = (ulong)playerName.GetHashCode(); // Deterministic ID
        await _context.SetupService.RegisterPlayerAsync(gameId, userId, playerName);
    }

    [Given(@"player ""(.*)"" has joined game (.*)")]
    public async Task GivenPlayerHasJoinedGame(string playerName, int gameId)
    {
        await WhenPlayerJoinsGame(playerName, gameId);
    }

    [Given(@"6 players have joined game (.*)")]
    public async Task GivenPlayersHaveJoinedGame(int gameId)
    {
        for (int i = 1; i <= 6; i++)
        {
            await WhenPlayerJoinsGame($"Player{i}", gameId);
        }
    }

    [When(@"player ""(.*)"" tries to join game (.*)")]
    public async Task WhenPlayerTriesToJoinGame(string playerName, int gameId)
    {
        try
        {
            await WhenPlayerJoinsGame(playerName, gameId);
        }
        catch (Exception ex)
        {
            _scenarioContext["Exception"] = ex;
        }
    }

    [Given(@"the game (.*) has started")]
    public void GivenTheGameHasStarted(int gameId)
    {
        _game.State.Phase = GamePhase.Storm;
    }

    [When(@"the game (.*) is started")]
    public async Task WhenTheGameIsStarted(int gameId)
    {
        try
        {
            await _context.SetupService.StartGameAsync(gameId);
        }
        catch (Exception ex)
        {
            _scenarioContext["Exception"] = ex;
        }
    }

    [Then(@"the game should have (.*) player")]
    public void ThenTheGameShouldHavePlayer(int count)
    {
        Assert.Equal(count, _game.State.Factions.Count);
    }

    [Then(@"the player ""(.*)"" should be in the game")]
    public void ThenThePlayerShouldBeInTheGame(string playerName)
    {
        Assert.Contains(_game.State.Factions, f => f.PlayerName == playerName);
    }

    [Then(@"the join request should be rejected")]
    public void ThenTheJoinRequestShouldBeRejected()
    {
        Assert.NotNull(_scenarioContext.Get<Exception>("Exception"));
    }
    
    [Then(@"the start request should be rejected")]
    public void ThenTheStartRequestShouldBeRejected()
    {
         Assert.NotNull(_scenarioContext.Get<Exception>("Exception"));
    }

    [Then(@"the game phase should be ""(.*)""")]
    public void ThenTheGamePhaseShouldBe(string phaseName)
    {
        Assert.Equal(phaseName, _game.State.Phase.ToString());
    }

    [Then(@"the Storm should be at a valid sector")]
    public void ThenTheStormShouldBeAtAValidSector()
    {
        Assert.InRange(_game.State.StormLocation, 1, 18);
    }

    [Then(@"Treachery Deck should be shuffled")]
    public void ThenTreacheryDeckShouldBeShuffled()
    {
        Assert.NotEmpty(_game.State.TreacheryDeck);
        _context.MockDeck.Verify(d => d.Shuffle(It.IsAny<System.Collections.Generic.List<string>>()), Times.AtLeastOnce);
    }

    [Then(@"Spice Deck should be shuffled")]
    public void ThenSpiceDeckShouldBeShuffled()
    {
        Assert.NotEmpty(_game.State.SpiceDeck);
        _context.MockDeck.Verify(d => d.Shuffle(It.IsAny<System.Collections.Generic.List<string>>()), Times.AtLeastOnce);
    }
}
