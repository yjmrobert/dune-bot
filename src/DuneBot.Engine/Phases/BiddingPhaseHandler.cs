using System.Linq;
using System.Threading.Tasks;
using DuneBot.Domain;
using DuneBot.Domain.Interfaces;
using DuneBot.Domain.State;

namespace DuneBot.Engine.Phases;

public class BiddingPhaseHandler : IGamePhaseHandler
{
    private readonly IRevivalService _revivalService;
    private readonly IBiddingService _biddingService;

    public BiddingPhaseHandler(IRevivalService revivalService, IBiddingService biddingService)
    {
        _revivalService = revivalService;
        _biddingService = biddingService;
    }

    public GamePhase Phase => GamePhase.Bidding;

    public async Task RunPhaseAsync(Game game)
    {
        await _biddingService.StartBiddingPhase(game);
        // Revival happens after Bidding is done.
    }

    public GamePhase GetNextPhase(Game game)
    {
        return GamePhase.Revival;
    }

    public string GetPhaseDescription(Game game)
    {
        var state = game.State;
        if (!state.IsBiddingRoundActive) return "Bidding round ended / check logs.";
        var bidder = state.Factions.FirstOrDefault(f => f.PlayerDiscordId == state.CurrentBidderId);
        var highBidder = state.Factions.FirstOrDefault(f => f.PlayerDiscordId == state.HighBidderId);
        return $"**Current Card:** {state.CurrentCard}\n" +
               $"**Current Bid:** {state.CurrentBid} (by {highBidder?.PlayerName ?? "None"})\n" +
               $"**Waiting for:** {bidder?.PlayerName}";
    }
}
