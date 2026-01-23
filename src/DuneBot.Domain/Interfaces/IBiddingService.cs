using System.Threading.Tasks;
using DuneBot.Domain.State;

namespace DuneBot.Domain.Interfaces;

public interface IBiddingService
{
    Task StartBiddingPhase(Game game);
    Task PlaceBidAsync(Game game, ulong userId, int amount);
    Task PassBidAsync(Game game, ulong userId);
    Task ResolveAuctionWin(Game game);
}
