using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using DuneBot.Domain;
using DuneBot.Domain.Interfaces;
using DuneBot.Domain.State;

namespace DuneBot.Engine.Services;

public class BiddingService : IBiddingService
{
    private readonly IDiscordService _discordService;
    private readonly IGameRepository _repository;
    private readonly IDeckService _deckService;
    private readonly IGameMessageService _messageService;

    public BiddingService(IDiscordService discordService, IGameRepository repository, IDeckService deckService, IGameMessageService messageService)
    {
        _discordService = discordService;
        _repository = repository;
        _deckService = deckService;
        _messageService = messageService;
    }

    public async Task StartBiddingPhase(Game game)
    {
        // 1. Determine eligible players (Hand < 4)
        var eligiblePlayers = game.State.Factions
            .Where(f => f.TreacheryCards.Count < 4 && f.PlayerDiscordId.HasValue)
            .Select(f => f.PlayerDiscordId!.Value)
            .ToList();

        game.State.PlayersEligibleToBid = eligiblePlayers;

        if (!eligiblePlayers.Any())
        {
            game.State.ActionLog.Add("Bidding: No players eligible to bid.");
            game.State.IsBiddingRoundActive = false;
            return;
        }

        // 2. Deal 1 card per eligible player
        game.State.AuctionQueue.Clear();
        for (int i = 0; i < eligiblePlayers.Count; i++)
        {
            var card = _deckService.Draw(game.State.TreacheryDeck, game.State.TreacheryDiscard);
            if (card != null)
            {
                game.State.AuctionQueue.Add(card);
            }
        }

        if (game.State.AuctionQueue.Count == 0)
        {
            game.State.ActionLog.Add("Bidding: No cards in deck.");
            game.State.IsBiddingRoundActive = false;
            return;
        }

        // Setup Bidding Thread
        var threadName = $"Bidding Round {game.State.Turn}";
        var threadId = await _discordService.CreatePhaseThreadAsync(game.GuildId, game.ActionsChannelId, threadName);
        game.State.BiddingThreadId = threadId;

        await _discordService.SendThreadMessageAsync(game.GuildId, threadId, 
            $"**Bidding Phase Started**\nEligible players: {eligiblePlayers.Count}\nCards up for auction: {game.State.AuctionQueue.Count}");

        // Start first auction
        await StartNextAuction(game);
    }

    private async Task StartNextAuction(Game game)
    {
        if (game.State.AuctionQueue.Count == 0)
        {
            await EndBiddingPhase(game);
            return;
        }

        // Pop card
        var card = game.State.AuctionQueue[0];
        game.State.AuctionQueue.RemoveAt(0);
        game.State.CurrentCard = card;
        game.State.CurrentBid = 0;
        game.State.HighBidderId = null;
        game.State.IsBiddingRoundActive = true;

        // Determine Starter
        ulong starterId;
        if (game.State.AuctionInitialBidderId == null)
        {
            // First card: Start with First Player (or next eligible logic?)
            // Rules: "Start with First Player. If that player has 4 cards, next player to right opens."
            starterId = GetFirstEligibleBidder(game, game.State.FirstPlayerId ?? 0); 
        }
        else
        {
            // Subsequent cards: Start with player to the right of the PREVIOUS card's opener
            starterId = GetNextEligibleBidder(game, game.State.AuctionInitialBidderId.Value);
        }

        game.State.AuctionInitialBidderId = starterId;
        game.State.CurrentBidderId = starterId;
        
        var starter = game.State.Factions.First(f => f.PlayerDiscordId == starterId);

        // Notify
        string msg = $"**Item up for bid:** ||{card}|| (Hidden)\n" +
                     $"Bidding starts with **{starter.PlayerName}**.";
                     
        // Atreides Prescience
        var atreides = game.State.Factions.FirstOrDefault(f => f.Faction == Faction.Atreides);
        if (atreides != null && atreides.PlayerDiscordId.HasValue)
        {
            await _discordService.SendDirectMessageAsync(atreides.PlayerDiscordId.Value,
                $"**[Atreides Prescience]** The card is: **{card}**");
             msg += "\n*(Atreides has been notified)*";
        }

        if (game.State.BiddingThreadId.HasValue)
        {
            await _discordService.SendActionMessageAsync(game.GuildId, game.State.BiddingThreadId.Value, msg, 
                ("Bid", "bidding_bid", "Primary"), 
                ("Pass", "bidding_pass", "Secondary"));
        }
    }

    public async Task PlaceBidAsync(Game game, ulong userId, int amount)
    {
        if (game.State.Phase != GamePhase.Bidding || !game.State.IsBiddingRoundActive)
            throw new Exception("Not in bidding phase.");

        if (game.State.CurrentBidderId != userId)
            throw new Exception("Not your turn to bid.");

        var faction = game.State.Factions.First(f => f.PlayerDiscordId == userId);

        if (faction.TreacheryCards.Count >= 4)
             throw new Exception("You have 4 cards and must pass.");

        if (amount <= game.State.CurrentBid)
            throw new Exception($"Bid must be higher than {game.State.CurrentBid}.");

        if (amount > faction.Spice)
            throw new Exception($"Not enough spice. You have {faction.Spice}.");

        game.State.CurrentBid = amount;
        game.State.HighBidderId = userId;
        game.State.ActionLog.Add($"**{faction.PlayerName}** bid **{amount}**.");

        if (game.State.BiddingThreadId.HasValue)
            await _discordService.SendThreadMessageAsync(game.GuildId, game.State.BiddingThreadId.Value,
                $"**{faction.PlayerName}** bids **{amount}**.");

        await AdvanceBidder(game);
        
        await _repository.UpdateGameAsync(game);
    }

    public async Task PassBidAsync(Game game, ulong userId)
    {
        if (game.State.CurrentBidderId != userId)
            throw new Exception("Not your turn.");

        var faction = game.State.Factions.First(f => f.PlayerDiscordId == userId);
        game.State.ActionLog.Add($"**{faction.PlayerName}** passed.");

        if (game.State.BiddingThreadId.HasValue)
            await _discordService.SendThreadMessageAsync(game.GuildId, game.State.BiddingThreadId.Value,
                $"**{faction.PlayerName}** passed.");

        await AdvanceBidder(game);

        if (game.State.HighBidderId.HasValue && game.State.CurrentBidderId == game.State.HighBidderId)
        {
            await ResolveAuctionWin(game);
        }
        else if (!game.State.HighBidderId.HasValue && CheckIfEveryonePassed(game)) 
        {
             if (game.State.CurrentBidderId == game.State.AuctionInitialBidderId)
             {
                 game.State.ActionLog.Add($"All players passed on **{game.State.CurrentCard}**. Returning to deck.");
                 if (game.State.BiddingThreadId.HasValue)
                    await _discordService.SendThreadMessageAsync(game.GuildId, game.State.BiddingThreadId.Value, "All players passed. Card returned.");
                 
                 game.State.TreacheryDeck.Insert(0, game.State.CurrentCard!);
                 
                 // Move to next card
                 await StartNextAuction(game);
             }
        }
        
        await _repository.UpdateGameAsync(game);
    }

    private async Task AdvanceBidder(Game game)
    {
        var currentId = game.State.CurrentBidderId!.Value;
        var nextId = GetNextEligibleBidder(game, currentId);
        game.State.CurrentBidderId = nextId;

        // Notify next bidder
        if (game.State.IsBiddingRoundActive && game.State.BiddingThreadId.HasValue)
        {
            // If the next bidder is the high bidder, we don't prompt them, we resolve. 
            // The resolution check happens in caller.
            // But if we are NOT resolving yet, we prompt.
            if (game.State.HighBidderId != nextId) 
            {
                var nextFaction = game.State.Factions.First(f => f.PlayerDiscordId == nextId);
                 await _discordService.SendActionMessageAsync(game.GuildId, game.State.BiddingThreadId.Value, 
                    $"It is **{nextFaction.PlayerName}**'s turn to bid.", 
                    ("Bid", "bidding_bid", "Primary"), 
                    ("Pass", "bidding_pass", "Secondary"));
            }
        }
    }

    private ulong GetNextEligibleBidder(Game game, ulong currentId)
    {
        var fractions = game.State.Factions;
        int idx = fractions.FindIndex(f => f.PlayerDiscordId == currentId);
        if (idx == -1) return currentId; // Should not happen

        int count = fractions.Count;
        // Loop up to count times to find someone else
        for (int i = 1; i <= count; i++)
        {
            var nextFac = fractions[(idx + i) % count];
            if (nextFac.PlayerDiscordId.HasValue) // Ensure actual player?
            {
               // Rules regarding Hand Limit:
               // "Players with a full hand... must pass".
               // Does this mean they are part of rotation? Yes. They just must pass.
               return nextFac.PlayerDiscordId.Value;
            }
        }
        return currentId;
    }

    private ulong GetFirstEligibleBidder(Game game, ulong startId)
    {
        // For the purpose of "Next Starting Bidder", we need to skip players who already have 4 cards?
        // Rules: "If that player already has 4... the next player... opens."
        // So for "Opening", we skip ineligible players.
        
        var fractions = game.State.Factions;
        int idx = fractions.FindIndex(f => f.PlayerDiscordId == startId);
        if (idx == -1) idx = 0; // Default

        int count = fractions.Count;
        for (int i = 0; i < count; i++)
        {
            var fac = fractions[(idx + i) % count];
            if (fac.TreacheryCards.Count < 4 && fac.PlayerDiscordId.HasValue)
            {
                return fac.PlayerDiscordId.Value;
            }
        }
        // If everyone has 4 cards, we shouldn't be here (checked in StartBiddingPhase).
        return startId;
    }
    
    // Helper simple check
    private bool CheckIfEveryonePassed(Game game)
    {
        return true; 
    }

    public async Task ResolveAuctionWin(Game game)
    {
        var winnerId = game.State.HighBidderId!.Value;
        var faction = game.State.Factions.First(f => f.PlayerDiscordId == winnerId);
        var card = game.State.CurrentCard;
        int cost = game.State.CurrentBid;

        faction.Spice -= cost;
        faction.TreacheryCards.Add(card!);

        // Emperor Pay
        if (faction.Faction != Faction.Emperor)
        {
            var emperor = game.State.Factions.FirstOrDefault(f => f.Faction == Faction.Emperor);
            if (emperor != null)
            {
                emperor.Spice += cost;
                game.State.ActionLog.Add($"**{emperor.PlayerName}** (Emperor) received {cost} spice.");
                 if (game.State.BiddingThreadId.HasValue)
                    await _discordService.SendThreadMessageAsync(game.GuildId, game.State.BiddingThreadId.Value, 
                        $"**Emperor** gains {cost} spice.");
            }
        }

        string winMsg = $"**{faction.PlayerName}** won **{card}** for **{cost}** spice!";
        game.State.ActionLog.Add(winMsg);

        if (game.State.BiddingThreadId.HasValue)
        {
            await _discordService.SendThreadMessageAsync(game.GuildId, game.State.BiddingThreadId.Value, winMsg);
            await _discordService.ArchiveThreadAsync(game.GuildId, game.State.BiddingThreadId.Value);
        }

        // Next card
        await StartNextAuction(game);
    }
    
    private async Task EndBiddingPhase(Game game)
    {
        game.State.IsBiddingRoundActive = false;
        game.State.CurrentCard = null;
        game.State.CurrentBid = 0;
        
        if (game.State.BiddingThreadId.HasValue)
        {
             await _discordService.SendThreadMessageAsync(game.GuildId, game.State.BiddingThreadId.Value, 
                "**Bidding Phase Ended.**");
             await _discordService.ArchiveThreadAsync(game.GuildId, game.State.BiddingThreadId.Value);
        }
        game.State.BiddingThreadId = null;
        await _repository.UpdateGameAsync(game);
    }
}
