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
public class BiddingPhaseSteps
{
    private readonly GameContext _context;
    private readonly ScenarioContext _scenarioContext;

    public BiddingPhaseSteps(GameContext context, ScenarioContext scenarioContext)
    {
        _context = context;
        _scenarioContext = scenarioContext;
    }

    private Game _game => _context.Game;

    [Given(@"a game with 4 factions: Atreides, Harkonnen, Emperor, Fremen")]
    public void GivenAGameWithFactions()
    {
        _game.State.Factions.Clear();
        var factions = new[] { Faction.Atreides, Faction.Harkonnen, Faction.Emperor, Faction.Fremen };
        ulong idCounter = 100;
        foreach (var faction in factions)
        {
            _game.State.Factions.Add(new FactionState
            {
                Faction = faction,
                PlayerDiscordId = idCounter++,
                PlayerName = faction.ToString(),
                Spice = 10 // Default spice
            });
        }
        
        // Ensure Deck has cards
        _game.State.TreacheryDeck = Enumerable.Range(1, 20).Select(i => $"Card_{i}").ToList();
    }

    [Given(@"the game is in the ""(.*)"" phase")]
    public void GivenTheGameIsInThePhase(string phase)
    {
        _game.State.Phase = Enum.Parse<GamePhase>(phase);
    }

    [Given(@"""(.*)"" has (.*) Treachery Cards")]
    public void GivenHasTreacheryCards(string factionName, int count)
    {
        var faction = _game.State.Factions.First(f => f.Faction.ToString() == factionName);
        faction.TreacheryCards.Clear();
        for (int i = 0; i < count; i++)
        {
            faction.TreacheryCards.Add($"Card_{i}");
        }
    }
    
    [Given(@"all players have (.*) Treachery Cards")]
    public void GivenAllPlayersHaveTreacheryCards(int count)
    {
        foreach (var f in _game.State.Factions)
        {
            f.TreacheryCards.Clear();
            for (int i = 0; i < count; i++) f.TreacheryCards.Add($"Card_{i}");
        }
    }

    [When(@"the Bidding Phase starts")]
    public async Task WhenTheBiddingPhaseStarts()
    {
        await _context.BiddingService.StartBiddingPhase(_game);
    }

    [Then(@"(.*) cards should be dealt for auction")]
    public void ThenCardsShouldBeDealtForAuction(int count)
    {
        Assert.Equal(count, _game.State.AuctionQueue.Count + (_game.State.CurrentCard != null ? 1 : 0));
    }

    [Then(@"""(.*)"" should not be eligible to bid")]
    public void ThenShouldNotBeEligibleToBid(string factionName)
    {
        var faction = _game.State.Factions.First(f => f.Faction.ToString() == factionName);
        Assert.DoesNotContain(faction.PlayerDiscordId!.Value, _game.State.PlayersEligibleToBid);
    }

    [Then(@"""(.*)"" should be eligible to bid")]
    public void ThenShouldBeEligibleToBid(string factionName)
    {
        var faction = _game.State.Factions.First(f => f.Faction.ToString() == factionName);
        Assert.Contains(faction.PlayerDiscordId!.Value, _game.State.PlayersEligibleToBid);
    }

    [Given(@"""(.*)"" is the First Player")]
    public void GivenIsTheFirstPlayer(string factionName)
    {
        var faction = _game.State.Factions.First(f => f.Faction.ToString() == factionName);
        _game.State.FirstPlayerId = faction.PlayerDiscordId;
    }
    
    [Given(@"""(.*)"" is first")]
    public void GivenIsFirst(string factionName) => GivenIsTheFirstPlayer(factionName); // Alias

    [Given(@"""(.*)"" is second")]
    public void GivenIsSecond(string factionName)
    {
        MoveFactionToIndex(factionName, 1);
    }
    
    [Given(@"""(.*)"" is third")]
    public void GivenIsThird(string factionName) => MoveFactionToIndex(factionName, 2);
    
    [Given(@"""(.*)"" is fourth")]
    public void GivenIsFourth(string factionName) => MoveFactionToIndex(factionName, 3);

    private void MoveFactionToIndex(string factionName, int index)
    {
        var faction = _game.State.Factions.First(f => f.Faction.ToString() == factionName);
        _game.State.Factions.Remove(faction);
        _game.State.Factions.Insert(index, faction);
    }

    [Then(@"it should be ""(.*)"" turn to bid")]
    public void ThenItShouldBeTurnToBid(string factionName)
    {
        var faction = _game.State.Factions.First(f => f.Faction.ToString() == factionName);
        Assert.Equal(faction.PlayerDiscordId, _game.State.CurrentBidderId);
    }

    [Given(@"the current bid is (.*)")]
    public void GivenTheCurrentBidIs(int bid)
    {
        _game.State.CurrentBid = bid;
    }

    [When(@"""(.*)"" places a bid of (.*)")]
    public async Task WhenPlacesABidOf(string factionName, int bid)
    {
         var faction = _game.State.Factions.First(f => f.Faction.ToString() == factionName);
         try 
         {
             await _context.BiddingService.PlaceBidAsync(_game, faction.PlayerDiscordId!.Value, bid);
         }
         catch (Exception ex)
         {
             _scenarioContext["Exception"] = ex;
         }
    }

    [Then(@"the bid should be rejected")]
    public void ThenTheBidShouldBeRejected()
    {
         Assert.NotNull(_scenarioContext.Get<Exception>("Exception"));
    }

    [Then(@"the current bid should be (.*)")]
    public void ThenTheCurrentBidShouldBe(int amount)
    {
        Assert.Equal(amount, _game.State.CurrentBid);
    }

    [Then(@"high bidder should be ""(.*)""")]
    public void ThenHighBidderShouldBe(string factionName)
    {
        var faction = _game.State.Factions.First(f => f.Faction.ToString() == factionName);
        Assert.Equal(faction.PlayerDiscordId, _game.State.HighBidderId);
    }

    [When(@"""(.*)"" passes")]
    public async Task WhenPasses(string factionName)
    {
         var faction = _game.State.Factions.First(f => f.Faction.ToString() == factionName);
         await _context.BiddingService.PassBidAsync(_game, faction.PlayerDiscordId!.Value);
    }

    [Then(@"""(.*)"" should win the auction")]
    public void ThenShouldWinTheAuction(string factionName)
    {
        var faction = _game.State.Factions.First(f => f.Faction.ToString() == factionName);
        bool won = _game.State.ActionLog.Any(l => l.Contains($"{faction.PlayerName}** won"));
        Assert.True(won, "Win message not found in log.");
    }

    [Then(@"""(.*)"" should have (.*) spice")]
    public void ThenShouldHaveSpice(string factionName, int amount)
    {
        var faction = _game.State.Factions.First(f => f.Faction.ToString() == factionName);
        Assert.Equal(amount, faction.Spice);
    }
    
    [Then(@"""(.*)"" should have (.*) Treachery Cards")]
    public void ThenShouldHaveTreacheryCards(string factionName, int amount)
    {
        var faction = _game.State.Factions.First(f => f.Faction.ToString() == factionName);
        Assert.Equal(amount, faction.TreacheryCards.Count);
    }

    [Given(@"there are (.*) cards up for auction")]
    public void GivenThereAreCardsUpForAuction(int count)
    {
        _game.State.AuctionQueue.Clear();
        for(int i=0; i<count; i++) _game.State.AuctionQueue.Add($"Card_{i}");
    }

    [Then(@"card (.*) should be sold")]
    public void ThenCardShouldBeSold(int index)
    {
        Assert.NotNull(_game.State.CurrentCard);
    }
    
     [Given(@"""(.*)"" has (.*) Treachery Card")]
    public void GivenHasCardSingular(string faction, int count) => GivenHasTreacheryCards(faction, count);
}
