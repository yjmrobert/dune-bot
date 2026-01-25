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
        // Phase is now manual. Wait for claims.
        game.State.ActionLog.Add(_messageService.GetChoamCharityPromptMessage());
        await Task.CompletedTask;
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
