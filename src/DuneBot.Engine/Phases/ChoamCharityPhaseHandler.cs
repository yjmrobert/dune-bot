using System.Threading.Tasks;
using DuneBot.Domain;
using DuneBot.Domain.Interfaces;
using DuneBot.Domain.State;

namespace DuneBot.Engine.Phases;

public class ChoamCharityPhaseHandler : IGamePhaseHandler
{
    private readonly IBiddingService _biddingService;
    private readonly IGameMessageService _messageService;

    public ChoamCharityPhaseHandler(IBiddingService biddingService, IGameMessageService messageService)
    {
        _biddingService = biddingService;
        _messageService = messageService;
    }

    public GamePhase Phase => GamePhase.ChoamCharity;

    public async Task RunPhaseAsync(Game game)
    {
        foreach (var faction in game.State.Factions)
        {
            if (faction.Spice < 2)
            {
                int amount = 2 - faction.Spice;
                faction.Spice = 2;
                game.State.ActionLog.Add(_messageService.GetChoamCharityMessage(faction.PlayerName, amount));
            }
        }
        
        // Start Bidding for next phase
        await _biddingService.StartBiddingPhase(game);
    }

    public GamePhase GetNextPhase(Game game)
    {
        return GamePhase.Bidding;
    }

    public string GetPhaseDescription(Game game)
    {
        return "Players with < 2 spice can claim Charity in logs.";
    }
}
