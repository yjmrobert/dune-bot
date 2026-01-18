using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using DuneBot.Domain;
using DuneBot.Domain.Interfaces;
using DuneBot.Domain.State;

namespace DuneBot.Engine;

public class GameEngine
{
    private readonly IGameRepository _repository;
    private readonly IDiscordService _discordService; // For posting updates
    private readonly IGameRenderer _renderer;
    private readonly IMapService _mapService;
    private readonly IDeckService _deckService;

    public GameEngine(IGameRepository repository, IDiscordService discordService, IGameRenderer renderer, IMapService mapService, IDeckService deckService)
    {
        _repository = repository;
        _discordService = discordService;
        _renderer = renderer;
        _mapService = mapService;
        _deckService = deckService;
    }

    public async Task RegisterPlayerAsync(int gameId, ulong userId, string username)
    {
        var game = await _repository.GetGameAsync(gameId);
        if (game == null) throw new Exception("Game not found.");
        
        if (game.State.Phase != GamePhase.Setup)
            throw new Exception("Cannot join game in progress.");

        if (game.State.Factions.Any(f => f.PlayerDiscordId == userId))
            throw new Exception("Player already joined.");

        if (game.State.Factions.Count >= 6)
            throw new Exception("Game full.");

        // Add player to a 'pool' or assign empty faction placeholder
        // valid factions: Atreides, Harkonnen, Fremen, etc.
        // We defer assignment to StartGame, so just track participants for now.
        // We'll use FactionState with Faction.None to track joined players.
        game.State.Factions.Add(new FactionState 
        { 
            Faction = Faction.None, 
            PlayerDiscordId = userId,
            PlayerName = username
        });

        game.State.ActionLog.Add($"Player {username} joined the game.");
        await _repository.UpdateGameAsync(game);
    }

    public async Task StartGameAsync(int gameId)
    {
        var game = await _repository.GetGameAsync(gameId);
        if (game == null) throw new Exception("Game not found.");
        
        if (game.State.Phase != GamePhase.Setup)
            throw new Exception("Game already started.");

        if (game.State.Factions.Count < 1) // Allow 1 for testing, normally 2-6
            throw new Exception("Not enough players.");

        // 1. Shuffle Factions
        var availableFactions = Enum.GetValues<Faction>()
            .Where(f => f != Faction.None)
            .OrderBy(x => Guid.NewGuid()) // Random shuffle
            .Take(game.State.Factions.Count)
            .ToList();

        // 2. Assign Factions
        for (int i = 0; i < game.State.Factions.Count; i++)
        {
            var player = game.State.Factions[i];
            player.Faction = availableFactions[i];
            
            // Initial Setup defaults (simplify for now)
            player.Spice = 10;
            player.Reserves = 10;
        }

        // 3. Initialize Map & Storm
        game.State.Map = _mapService.InitializeMap();
        game.State.StormLocation = new Random().Next(1, 19); // 1-18
        
        // 4. Initialize Decks
        game.State.TreacheryDeck = _deckService.GetTreacheryDeck();
        _deckService.Shuffle(game.State.TreacheryDeck);
        
        game.State.SpiceDeck = _deckService.GetSpiceDeck();
        _deckService.Shuffle(game.State.SpiceDeck);
        
        game.State.TraitorDeck = _deckService.GetTraitorDeck();
        _deckService.Shuffle(game.State.TraitorDeck); 
        
        // 5. Deal Traitors
        foreach (var faction in game.State.Factions)
        {
            for (int k = 0; k < 4; k++)
            {
                var card = _deckService.Draw(game.State.TraitorDeck, new List<string>()); // No discard for setup
                if (card != null) faction.Traitors.Add(card);
            }
        }

        // 6. Set Phase
        game.State.Phase = GamePhase.Storm;
        game.State.Turn = 1;
        game.State.ActionLog.Add($"Game Started! Storm is at Sector {game.State.StormLocation}.");

        await _repository.UpdateGameAsync(game);
        
        await PostGameUpdate(game); 
    }

    public async Task AdvancePhaseAsync(int gameId)
    {
        var game = await _repository.GetGameAsync(gameId);
        if (game == null) throw new Exception("Game not found.");
        
        // Game End Check
        if (game.State.Turn > 10)
        {
            await EndGameAsync(game);
            return;
        }

        var currentPhase = game.State.Phase;
        GamePhase nextPhase;

        // Phase Transition Logic
        switch (currentPhase)
        {
            case GamePhase.Setup:
                nextPhase = GamePhase.Storm;
                game.State.Turn = 1;
                break;
            case GamePhase.MentatPause:
                // End of Round
                if (game.State.Turn >= 10)
                {
                    await EndGameAsync(game);
                    return;
                }
                
                // Storm Logic
                int move = new Random().Next(1, 7); // d6
                int oldSector = game.State.StormLocation;
                int newSector = _mapService.CalculateNextStormSector(oldSector, move);
                game.State.StormLocation = newSector;
                
                nextPhase = GamePhase.Storm;
                game.State.Turn++;
                game.State.ActionLog.Add($"--- Round {game.State.Turn} Started ---");
                game.State.ActionLog.Add($"Storm moved {move} sectors from {oldSector} to {newSector}.");
                break;
            case GamePhase.Storm:
                // Handle Spice Blow
                nextPhase = ResolveSpiceBlow(game);
                break;
            case GamePhase.SpiceBlow:
                // If we are here, we might have been holding for something, or just moving on.
                // Normally ResolveSpiceBlow decides where to go (Nexus or Choam).
                // If we were in Nexus, we go to Choam.
                nextPhase = GamePhase.ChoamCharity;
                break;
            case GamePhase.ChoamCharity:
                // Implement CHOAM Charity
                foreach (var faction in game.State.Factions)
                {
                    if (faction.Spice < 2)
                    {
                        int amount = 2 - faction.Spice;
                        faction.Spice = 2;
                        game.State.ActionLog.Add($"**{faction.PlayerName}** received {amount} spice from CHOAM Charity.");
                    }
                }
                
                // After Choam, we start Bidding
                await StartBiddingPhase(game);
                nextPhase = GamePhase.Bidding;
                break;
            case GamePhase.Bidding:
                // If we are here, bidding is done for the round (or for the single card in MVP)
                StartRevivalPhase(game);
                nextPhase = GamePhase.Revival;
                break;
                StartShipmentPhase(game);
                nextPhase = GamePhase.ShipmentAndMovement;
                break;
            case GamePhase.ShipmentAndMovement:
                // Scan for Battles
                var battles = DetectBattles(game);
                if (battles.Any())
                {
                    foreach (var b in battles) game.State.PendingBattles.Enqueue(b);
                    
                    StartNextBattle(game);
                    nextPhase = GamePhase.Battle;
                }
                else
                {
                    // No battles, skip to Spice Collection
                    nextPhase = GamePhase.SpiceCollection;
                }
                break;
            case GamePhase.Battle:
                if (game.State.PendingBattles.Count > 0 || (game.State.CurrentBattle != null && game.State.CurrentBattle.IsActive))
                {
                    // Battles still active, don't advance phase automatically via this method unless resolved?
                    // Usually AdvancePhase is called by "Next Phase" button.
                    // If we are in Battle phase, we might want to block manual advance until battles are done?
                    // Or "Next Phase" checks if battles are done.
                    
                    if (game.State.CurrentBattle != null && game.State.CurrentBattle.IsActive)
                        throw new Exception("Battle in progress. Resolve it first.");
                        
                    if (game.State.PendingBattles.Count > 0)
                    {
                        StartNextBattle(game);
                        nextPhase = GamePhase.Battle; // Stay in Battle
                    }
                    else
                    {
                        nextPhase = GamePhase.SpiceCollection;
                    }
                }
                else
                {
                    nextPhase = GamePhase.SpiceCollection;
                }
                break;
            case GamePhase.SpiceCollection:
                // Implement Spice Collection (Harvest)
                // Everyone with forces in territory with SpiceBlowAmount collects it.
                // Limit: 2 spice per force (3 if Ornithopters? No, 2 normally. 3 if you have control of A/C? 
                // Rule: "2 spice per force if you control Arrakeen or Carthag... otherwise 2 spice per force? No."
                // Rule: "Collection rate is 2 spice per force if you occupy Arrakeen or Carthag. Otherwise 3 per force?
                // Wait, typically 2 per force normally. 3 if you have city?
                // Let's simplify: 2 per force.
                // Harvest logic here...
                // Only territories with SpiceBlowAmount > 0.
                
                foreach(var t in game.State.Map.Territories.Where(t => t.SpiceBlowAmount > 0))
                {
                    if (t.FactionForces.Any())
                    {
                        // Multiple factions? No, storm/battle should have resolved this or cleared it?
                        // If multiple factions, no collection happens usually? Or they share?
                        // Battle phase precedes this. So only 1 faction should remain.
                        if (t.FactionForces.Count == 1)
                        {
                            var factionType = t.FactionForces.Keys.First();
                            var count = t.FactionForces[factionType];
                            var collectionRate = 2; // Default
                            // Check cities for rate boost?
                            // MVP: 2 per force.
                            
                            int collected = Math.Min(t.SpiceBlowAmount, count * collectionRate);
                            t.SpiceBlowAmount -= collected;
                            
                            var factionState = game.State.Factions.FirstOrDefault(f => f.Faction == factionType);
                            if (factionState != null)
                            {
                                factionState.Spice += collected;
                                game.State.ActionLog.Add($"**{factionState.PlayerName}** collected {collected} spice from {t.Name}.");
                            }
                        }
                    }
                }
                
                nextPhase = GamePhase.MentatPause;
                break;

            default:
                // Linear progression for standard phases
                nextPhase = currentPhase + 1;
                break;
        }

        game.State.Phase = nextPhase;
        game.State.ActionLog.Add($"Phase advanced to {game.State.Phase}.");
        
        await _repository.UpdateGameAsync(game);
        await PostGameUpdate(game);
    }

    private async Task StartBiddingPhase(Game game)
    {
        // 1. Draw Card
        var card = _deckService.Draw(game.State.TreacheryDeck, game.State.TreacheryDiscard);
        if (card == null)
        {
            game.State.ActionLog.Add("Bidding: No Treachery Cards left!");
            game.State.BiddingCard = null;
            return;
        }
        
        // 2. Setup Auction State
        game.State.BiddingCard = card;
        game.State.CurrentBid = 0;
        game.State.HighBidderId = null;
        game.State.IsBiddingRoundActive = true;
        
        // 3. Create Thread
        var threadName = $"Bidding Round {game.State.Turn}";
        var threadId = await _discordService.CreatePhaseThreadAsync(game.GuildId, game.ActionsChannelId, threadName);
        game.State.BiddingThreadId = threadId;

        // 4. Determine First Bidder
        if (game.State.Factions.Count > 0)
        {
            game.State.CurrentBidderId = game.State.Factions[0].PlayerDiscordId;
            var name = game.State.Factions[0].PlayerName;
            
            string msg = $"**Bidding Started for {card}!**\n" +
                         $"Bidding starts with **{name}**.\n" +
                         $"Use `/bid amount` or `/pass`.";
            
            await _discordService.SendThreadMessageAsync(game.GuildId, threadId, msg);
            game.State.ActionLog.Add($"Bidding started for **{card}** in thread.");
        }
    }

    public async Task PlaceBidAsync(int gameId, ulong userId, int amount)
    {
        var game = await _repository.GetGameAsync(gameId);
        if (game == null) throw new Exception("Game not found.");
        
        if (game.State.Phase != GamePhase.Bidding || !game.State.IsBiddingRoundActive)
            throw new Exception("Not in bidding phase.");
            
        if (game.State.CurrentBidderId != userId)
            throw new Exception("Not your turn to bid.");
            
        var faction = game.State.Factions.First(f => f.PlayerDiscordId == userId);
        
        if (amount > faction.Spice)
            throw new Exception($"Not enough spice. You have {faction.Spice}.");
            
        if (amount <= game.State.CurrentBid)
            throw new Exception($"Bid must be higher than {game.State.CurrentBid}.");
            
        // Valid Bid
        game.State.CurrentBid = amount;
        game.State.HighBidderId = userId;
        game.State.ActionLog.Add($"**{faction.PlayerName}** bid **{amount}** spice.");
        
        if (game.State.BiddingThreadId.HasValue)
            await _discordService.SendThreadMessageAsync(game.GuildId, game.State.BiddingThreadId.Value, $"**{faction.PlayerName}** bids **{amount}**.");

        AdvanceBidder(game);
        
        await _repository.UpdateGameAsync(game);
        // await PostGameUpdate(game); 
    }

    public async Task PassBidAsync(int gameId, ulong userId)
    {
        var game = await _repository.GetGameAsync(gameId);
        if (game == null) throw new Exception("Game not found.");
        
        if (game.State.CurrentBidderId != userId)
            throw new Exception("Not your turn.");

        var faction = game.State.Factions.First(f => f.PlayerDiscordId == userId);
        game.State.ActionLog.Add($"**{faction.PlayerName}** passed.");

        if (game.State.BiddingThreadId.HasValue)
            await _discordService.SendThreadMessageAsync(game.GuildId, game.State.BiddingThreadId.Value, $"**{faction.PlayerName}** passed.");
        
        AdvanceBidder(game);
        
        // Check for Winner
        if (game.State.HighBidderId.HasValue && game.State.CurrentBidderId == game.State.HighBidderId)
        {
            await ResolveAuctionWin(game);
        }
        else if (!game.State.HighBidderId.HasValue && CheckIfAllPassed(game)) 
        {
            if (game.State.BiddingThreadId.HasValue)
                await _discordService.SendThreadMessageAsync(game.GuildId, game.State.BiddingThreadId.Value, "All players passed. Card returned to deck.");
            
            game.State.IsBiddingRoundActive = false;
            if (game.State.BiddingThreadId.HasValue)
                await _discordService.ArchiveThreadAsync(game.GuildId, game.State.BiddingThreadId.Value);
        }

        await _repository.UpdateGameAsync(game);
    }
    
    private void AdvanceBidder(Game game)
    {
        var currentIdx = game.State.Factions.FindIndex(f => f.PlayerDiscordId == game.State.CurrentBidderId);
        if (currentIdx == -1) return;
        
        int nextIdx = (currentIdx + 1) % game.State.Factions.Count;
        game.State.CurrentBidderId = game.State.Factions[nextIdx].PlayerDiscordId;
    }
    
    private bool CheckIfAllPassed(Game game)
    {
        return false; 
    }

    private async Task ResolveAuctionWin(Game game)
    {
        var winnerId = game.State.HighBidderId!.Value;
        var faction = game.State.Factions.First(f => f.PlayerDiscordId == winnerId);
        var card = game.State.BiddingCard;
        int cost = game.State.CurrentBid;
        
        faction.Spice -= cost;
        faction.TreacheryCards.Add(card!);
        
        string winMsg = $"**{faction.PlayerName}** won **{card}** for **{cost}** spice!";
        game.State.ActionLog.Add(winMsg);
        
        if (game.State.BiddingThreadId.HasValue)
        {
            await _discordService.SendThreadMessageAsync(game.GuildId, game.State.BiddingThreadId.Value, winMsg);
            await _discordService.ArchiveThreadAsync(game.GuildId, game.State.BiddingThreadId.Value);
        }
        
        game.State.BiddingCard = null;
        game.State.CurrentBid = 0;
        game.State.HighBidderId = null;
        game.State.CurrentBidderId = null;
        game.State.IsBiddingRoundActive = false;
        game.State.BiddingThreadId = null;
    }

    private void StartRevivalPhase(Game game)
    {
        // Reset revival limits
        foreach(var f in game.State.Factions)
        {
            f.RevivedTroopsThisTurn = 0;
            // Free revival? Dune rules say 3 are free if they are your only troops... no, standard is:
            // "You may revive up to 3 forces... cost is 2 spice each."
            // "Fremen: 3 forces for free."
            // "If you have NO forces on planet, you get free revival up to 3?" - No, that's Starship Troopers maybe.
            // Simplified: All pay 2 spice, except Fremen pay 0.
            // Revival limit is 3 forces + 1 leader.
        }
        game.State.ActionLog.Add("Revival Phase: Revive up to 3 forces and 1 leader.");
    }
    
    public async Task ReviveForcesAsync(int gameId, ulong userId, int amount)
    {
        var game = await _repository.GetGameAsync(gameId);
        if (game == null) throw new Exception("Game not found.");
        
        if (game.State.Phase != GamePhase.Revival) throw new Exception("Not in Revival phase.");
        
        var faction = game.State.Factions.First(f => f.PlayerDiscordId == userId);
        
        if (amount <= 0) throw new Exception("Amount must be positive.");
        if (faction.ForcesInTanks < amount) throw new Exception($"Not enough forces in Tanks. You have {faction.ForcesInTanks}.");
        
        int limit = 3; 
        if (faction.RevivedTroopsThisTurn + amount > limit) throw new Exception($"Revival limit exceeded. You can revive {limit - faction.RevivedTroopsThisTurn} more.");
        
        int costPerForce = (faction.Faction == Faction.Fremen) ? 0 : 2;
        int totalCost = amount * costPerForce;
        
        if (faction.Spice < totalCost) throw new Exception($"Not enough spice. Cost: {totalCost}. You have {faction.Spice}.");
        
        // Execute
        faction.Spice -= totalCost;
        faction.ForcesInTanks -= amount;
        faction.Reserves += amount;
        faction.RevivedTroopsThisTurn += amount;
        
        game.State.ActionLog.Add($"**{faction.PlayerName}** revived {amount} forces to reserves.");
        await _repository.UpdateGameAsync(game);
    }
    
    public async Task ReviveLeaderAsync(int gameId, ulong userId, string leaderName)
    {
        var game = await _repository.GetGameAsync(gameId);
        if (game == null) throw new Exception("Game not found.");
        
        if (game.State.Phase != GamePhase.Revival) throw new Exception("Not in Revival phase.");
        
        var faction = game.State.Factions.First(f => f.PlayerDiscordId == userId);
        
        // In real game, check limit 1 leader per turn. For now, assume if they haven't passed, they can do it once?
        // Let's rely on simple cost check for MVP. Leader limit is 1. We might track it later if needed.
        
        if (!faction.DeadLeaders.Contains(leaderName))
            throw new Exception("Leader not in Tanks.");
            
        int cost = 2; // Simplified cost
        // Leader cost is normally their strength.
        
        if (faction.Spice < cost) throw new Exception($"Not enough spice. Cost: {cost}.");
        
        faction.Spice -= cost;
        faction.DeadLeaders.Remove(leaderName);
        // Add back to alive leaders? We don't track alive leaders list explicitly yet, implied by not being in Dead?
        // Wait, FactionState doesn't have "Leaders" list. 
        // We need to implement Leaders tracking properly or just assume if not dead, they are alive.
        // For MVP, just removing from DeadLeaders is enough to make them "alive".
        
        game.State.ActionLog.Add($"**{faction.PlayerName}** revived leader **{leaderName}**.");
        await _repository.UpdateGameAsync(game);
    }

    private GamePhase ResolveSpiceBlow(Game game)
    {
        var card = _deckService.Draw(game.State.SpiceDeck, game.State.SpiceDiscard);
        if (card == null)
        {
            game.State.ActionLog.Add("Spice Blow: No cards left!");
            return GamePhase.ChoamCharity;
        }

        game.State.ActionLog.Add($"Spice Blow: Drawn **{card}**.");

        if (card == "Shai-Hulud")
        {
            game.State.ActionLog.Add("**NEXUS!** Alliances may be formed/broken.");
            // Discard
            game.State.SpiceDiscard.Add(card);
            // Nexus logic would go here (e.g. devour forces in territory if we tracked discard properly)
            return GamePhase.Nexus;
        }
        else
        {
            // It's a territory
            var territory = game.State.Map.Territories.FirstOrDefault(t => t.Name == card);
            if (territory != null)
            {
                int spiceAmount = (territory.Name == "Broken Land" || territory.Name == "South Mesa" || territory.Name == "The Great Flat") ? 10 : 6;
                // Add spice
                territory.SpiceBlowAmount += spiceAmount;
                game.State.ActionLog.Add($"Spice Blow in **{card}**! {spiceAmount} spice added.");
            }
            // Discard
            game.State.SpiceDiscard.Add(card);
            
            return GamePhase.ChoamCharity; // Skip Nexus
        }
    }

    private void StartShipmentPhase(Game game)
    {
        foreach(var f in game.State.Factions)
        {
            f.HasShipped = false;
            f.HasMoved = false;
        }
        game.State.ActionLog.Add("Shipment & Movement Phase Started.");
    }

    public async Task ShipForcesAsync(int gameId, ulong userId, string toTerritoryName, int amount)
    {
        var game = await _repository.GetGameAsync(gameId);
        if (game == null) throw new Exception("Game not found.");
        
        if (game.State.Phase != GamePhase.ShipmentAndMovement) throw new Exception("Not in Shipment/Movement phase.");
        
        var faction = game.State.Factions.First(f => f.PlayerDiscordId == userId);
        if (faction.HasShipped) throw new Exception("You have already shipped this turn.");
        
        // 1. Validate Territory && Storm
        var territory = game.State.Map.Territories.FirstOrDefault(t => t.Name == toTerritoryName);
        if (territory == null) throw new Exception("Territory not found.");
        if (territory.Sector == game.State.StormLocation) throw new Exception("Cannot ship into Storm.");

        // 2. Validate Reserves
        if (amount <= 0) throw new Exception("Amount must be positive.");
        if (faction.Reserves < amount) throw new Exception($"Not enough reserves. You have {faction.Reserves}.");

        // 3. Calculate Cost
        // Simplified: 1 spice/force if Stronghold (and you occupy it? No, usually if you are shipping TO it).
        // Rules: "1 spice per force to issue to a stronghold... 2 spice... to any other territory."
        int costPerForce = territory.IsStronghold ? 1 : 2; 
        int totalCost = amount * costPerForce;
        
        // Guild discount? "Guild pays half" (rounded up). MVP: Ignore Guild discount for now or implement if easy.
        // Let's stick to base rules.
        
        if (faction.Spice < totalCost) throw new Exception($"Not enough spice. Cost: {totalCost}. You have {faction.Spice}.");

        // 4. Execute
        faction.Spice -= totalCost;
        faction.Reserves -= amount;
        
        if (!territory.FactionForces.ContainsKey(faction.Faction))
            territory.FactionForces[faction.Faction] = 0;
            
        territory.FactionForces[faction.Faction] += amount;
        
        faction.HasShipped = true;
        game.State.ActionLog.Add($"**{faction.PlayerName}** shipped {amount} forces to **{toTerritoryName}** for {totalCost} spice.");
        
        await _repository.UpdateGameAsync(game);
    }
    
    public async Task MoveForcesAsync(int gameId, ulong userId, string fromTerritoryName, string toTerritoryName, int amount)
    {
        var game = await _repository.GetGameAsync(gameId);
        if (game == null) throw new Exception("Game not found.");
        
        if (game.State.Phase != GamePhase.ShipmentAndMovement) throw new Exception("Not in Shipment/Movement phase.");
        
        var faction = game.State.Factions.First(f => f.PlayerDiscordId == userId);
        if (faction.HasMoved) throw new Exception("You have already moved this turn.");

        // 1. Validate Locations
        var fromT = game.State.Map.Territories.FirstOrDefault(t => t.Name == fromTerritoryName);
        var toT = game.State.Map.Territories.FirstOrDefault(t => t.Name == toTerritoryName);
        
        if (fromT == null || toT == null) throw new Exception("Invalid territory.");
        
        // 2. Validate Ownership/Presence
        if (!fromT.FactionForces.ContainsKey(faction.Faction) || fromT.FactionForces[faction.Faction] < amount)
            throw new Exception($"Not enough forces in {fromTerritoryName}.");
            
        // 3. Validate Storm
        // Cannot move out of, into, or through storm.
        // Simple check: Is Start or End in Storm?
        if (fromT.Sector == game.State.StormLocation || toT.Sector == game.State.StormLocation)
            throw new Exception("Cannot move through Storm.");
            
        // 4. Validate Reachability (Adjacency)
        // Range: 1 usually. 3 if Ornithopters.
        // Ornithopters: "If you have forces in Arrakeen or Carthag."
        bool hasOrnithopters = game.State.Map.Territories
            .Any(t => (t.Name == "Arrakeen" || t.Name == "Carthag") && 
                      t.FactionForces.ContainsKey(faction.Faction) && 
                      t.FactionForces[faction.Faction] > 0);
                      
        int maxMoves = hasOrnithopters ? 3 : 1;
        
        if (!_mapService.IsReachable(fromTerritoryName, toTerritoryName, maxMoves))
            throw new Exception($"Destination unreachable (Max moves: {maxMoves}).");

        // 5. Execute
        fromT.FactionForces[faction.Faction] -= amount;
        if (fromT.FactionForces[faction.Faction] == 0) fromT.FactionForces.Remove(faction.Faction);
        
        if (!toT.FactionForces.ContainsKey(faction.Faction))
            toT.FactionForces[faction.Faction] = 0;
        toT.FactionForces[faction.Faction] += amount;
        
        faction.HasMoved = true;
        game.State.ActionLog.Add($"**{faction.PlayerName}** moved {amount} forces from **{fromTerritoryName}** to **{toTerritoryName}**.");
        
        await _repository.UpdateGameAsync(game);
    }

    private List<BattleState> DetectBattles(Game game)
    {
        var battles = new List<BattleState>();
        foreach(var t in game.State.Map.Territories)
        {
            if (t.FactionForces.Count >= 2)
            {
                // Battle detected
                // Assuming only 2 factions for MVP simplifiction
                var keys = t.FactionForces.Keys.ToList();
                var f1 = game.State.Factions.First(f => f.Faction == keys[0]);
                var f2 = game.State.Factions.First(f => f.Faction == keys[1]);
                
                // Storm check? Battles don't happen in storm?
                // If storm is over territory, forces are killed?
                // Phase order: Storm -> Spice -> ... -> Shipment -> Battle.
                // Storm moves at start. If storm moves OVER you, you die (unless Fremen/Sector).
                // So forces in Storm should have been wiped already or are safe.
                // Battle can happen in Storm if both survive? Rules say "No battle in storm"?
                // MVP: Ignore storm check for battle generation for now.
                
                battles.Add(new BattleState
                {
                    TerritoryName = t.Name,
                    Faction1Id = f1.PlayerDiscordId ?? 0,
                    Faction2Id = f2.PlayerDiscordId ?? 0,
                    IsActive = false
                });
            }
        }
        return battles;
    }

    private void StartNextBattle(Game game)
    {
        if (game.State.PendingBattles.Count == 0) return;
        
        var battle = game.State.PendingBattles.Dequeue();
        battle.IsActive = true;
        game.State.CurrentBattle = battle;
        
        var f1 = game.State.Factions.First(f => f.PlayerDiscordId == battle.Faction1Id);
        var f2 = game.State.Factions.First(f => f.PlayerDiscordId == battle.Faction2Id);
        
        game.State.ActionLog.Add($"**BATTLE** in **{battle.TerritoryName}**! **{f1.PlayerName}** vs **{f2.PlayerName}**.");
        game.State.ActionLog.Add("Submit battle plans with `/battle commit`.");
    }
    
    public async Task SubmitBattlePlanAsync(int gameId, ulong userId, string leader, int dial, string? weapon, string? defense)
    {
        var game = await _repository.GetGameAsync(gameId);
        if (game == null) throw new Exception("Game not found.");
        
        if (game.State.Phase != GamePhase.Battle) throw new Exception("Not in Battle phase.");
        if (game.State.CurrentBattle == null || !game.State.CurrentBattle.IsActive) throw new Exception("No active battle.");
        
        var battle = game.State.CurrentBattle;
        if (userId != battle.Faction1Id && userId != battle.Faction2Id) throw new Exception("You are not in this battle.");
        
        var faction = game.State.Factions.First(f => f.PlayerDiscordId == userId);
        
        // Validation
        // 1. Leader owned? (Need check against available leaders... simplified: Check NOT in Tanks + valid name?)
        // We lack "Alive Leaders" list. We only have DeadLeaders.
        // Assume valid if not dead for MVP.
        if (faction.DeadLeaders.Contains(leader)) throw new Exception("Leader is dead.");
        
        // 2. Dial limit (Must not exceed forces in territory)
        var territory = game.State.Map.Territories.First(t => t.Name == battle.TerritoryName);
        if (!territory.FactionForces.ContainsKey(faction.Faction)) throw new Exception("You have no forces there?"); // Should not happen
        int maxForces = territory.FactionForces[faction.Faction];
        if (dial < 0 || dial > maxForces) throw new Exception($"Invalid dial. Max {maxForces}.");
        
        // 3. Cards owned?
        if (!string.IsNullOrEmpty(weapon) && !faction.TreacheryCards.Contains(weapon)) throw new Exception($"You don't have {weapon}.");
        if (!string.IsNullOrEmpty(defense) && !faction.TreacheryCards.Contains(defense)) throw new Exception($"You don't have {defense}.");

        // Save Plan
        if (!battle.Plans.ContainsKey(userId)) battle.Plans[userId] = new BattlePlan();
        
        battle.Plans[userId] = new BattlePlan
        {
            LeaderName = leader,
            Dial = dial,
            Weapon = weapon,
            Defense = defense
        };
        
        game.State.ActionLog.Add($"**{faction.PlayerName}** committed battle plan.");
        
        // Check if both submitted
        if (battle.Plans.Count == 2)
        {
            game.State.ActionLog.Add("Both plans committed! Resolving...");
            ResolveBattle(game, battle);
        }
        
        await _repository.UpdateGameAsync(game);
    }
    
    private void ResolveBattle(Game game, BattleState battle)
    {
        var p1Id = battle.Faction1Id;
        var p2Id = battle.Faction2Id;
        
        var plan1 = battle.Plans[p1Id];
        var plan2 = battle.Plans[p2Id];
        
        var f1 = game.State.Factions.First(f => f.PlayerDiscordId == p1Id);
        var f2 = game.State.Factions.First(f => f.PlayerDiscordId == p2Id);

        // Helper to get logic
        double GetLeaderStrength(string name) => 5; // MVP: All leaders 5. Refactor to real data later.
        
        game.State.ActionLog.Add($"**Resolution**: {f1.PlayerName} (L: {plan1.LeaderName}, W: {plan1.Weapon}, D: {plan1.Defense}, Dial: {plan1.Dial}) VS {f2.PlayerName} (L: {plan2.LeaderName}, W: {plan2.Weapon}, D: {plan2.Defense}, Dial: {plan2.Dial})");

        // 1. Traitor Check
        bool f1Traitor = f1.Traitors.Contains(plan2.LeaderName); // P1 has P2's leader as traitor
        bool f2Traitor = f2.Traitors.Contains(plan1.LeaderName);
        
        if (f1Traitor && f2Traitor)
        {
             game.State.ActionLog.Add("Both leaders are TRAITORS! Both armies lost.");
             // Both lose everything
             ClearForces(game, battle.TerritoryName, f1.Faction);
             ClearForces(game, battle.TerritoryName, f2.Faction);
             battle.IsActive = false;
             return;
        }
        else if (f1Traitor)
        {
            game.State.ActionLog.Add($"**{plan2.LeaderName}** is a TRAITOR for {f1.PlayerName}! {f1.PlayerName} wins automatically.");
            WinBattle(game, battle, f1, f2, plan1, plan2, 0, true); // 0 cost
            return;
        }
        else if (f2Traitor)
        {
            game.State.ActionLog.Add($"**{plan1.LeaderName}** is a TRAITOR for {f2.PlayerName}! {f2.PlayerName} wins automatically.");
            WinBattle(game, battle, f2, f1, plan2, plan1, 0, true);
            return;
        }

        // 2. Combat Logic (Weapon vs Defense)
        bool l1Dead = IsLeaderKilled(plan1.LeaderName, plan2.Weapon, plan1.Defense);
        bool l2Dead = IsLeaderKilled(plan2.LeaderName, plan1.Weapon, plan2.Defense);
        
        if (l1Dead) 
        {
            game.State.ActionLog.Add($"**{plan1.LeaderName}** killed!");
            f1.DeadLeaders.Add(plan1.LeaderName);
        }
        if (l2Dead) 
        {
            game.State.ActionLog.Add($"**{plan2.LeaderName}** killed!");
            f2.DeadLeaders.Add(plan2.LeaderName);
        }

        // 3. Calculate Score
        // Score = Dial + (LeaderAlive ? Strength : 0)
        // MVP: Leader strength hardcoded to 5.
        double s1 = plan1.Dial + (l1Dead ? 0 : 5); 
        double s2 = plan2.Dial + (l2Dead ? 0 : 5);
        
        game.State.ActionLog.Add($"Scores: {f1.PlayerName}={s1}, {f2.PlayerName}={s2}");
        
        if (s1 > s2)
        {
            WinBattle(game, battle, f1, f2, plan1, plan2, plan1.Dial, false);
        }
        else if (s2 > s1)
        {
            WinBattle(game, battle, f2, f1, plan2, plan1, plan2.Dial, false);
        }
        else
        {
             game.State.ActionLog.Add("Tie! aggressor loses? MVP: Both lose forces, defender keeps territory?");
             // Simplification: Both lose dial.
             RemoveForces(game, battle.TerritoryName, f1.Faction, plan1.Dial);
             RemoveForces(game, battle.TerritoryName, f2.Faction, plan2.Dial);
             battle.IsActive = false;
        }
    }
    
    private bool IsLeaderKilled(string leader, string? incomingWeapon, string? myDefense)
    {
        if (string.IsNullOrEmpty(incomingWeapon)) return false;
        
        // MVP Logic: 
        // Weapon: "Lasgun", "Crysknife", "Maula Pistol" ? 
        // Defense: "Shield", "Snooper"?
        // Simplified: If Weapon != null and Defense == null -> Dead.
        // Actually name matching is better.
        // "Projectile" needs "Shield". "Poison" needs "Snooper".
        // Let's assume input text standardizes type.
        // OR just simple: Weapon kills unless Defense is played.
        
        if (string.IsNullOrEmpty(myDefense)) return true; // No defense = Dead
        return false; // Has defense = Alive (MVP)
    }
    
    private void WinBattle(Game game, BattleState battle, FactionState winner, FactionState loser, BattlePlan winnerPlan, BattlePlan loserPlan, int winnerCost, bool traitorWin)
    {
        game.State.ActionLog.Add($"**{winner.PlayerName}** wins!");
        
        // Winner pays forces (unless traitor win? Rules: Traitor win = no loss? check rules. Yes, immediate win, no battle fought.)
        if (!traitorWin)
            RemoveForces(game, battle.TerritoryName, winner.Faction, winnerCost);
            
        // Loser loses ALL forces in territory
        ClearForces(game, battle.TerritoryName, loser.Faction);
        
        // Spice Payout (if leader survived and not traitor)
        // If leader killed or traitor, no spice.
        // Traitor win: Winner gets spice for enemy leader strength? Yes.
        
        winner.Spice += 5; // Leader strength
        game.State.ActionLog.Add($"**{winner.PlayerName}** collects 5 spice for the victory.");

        battle.IsActive = false;
    }
    
    private void RemoveForces(Game game, string territoryName, Faction faction, int amount)
    {
        var t = game.State.Map.Territories.First(x => x.Name == territoryName);
        if (t.FactionForces.ContainsKey(faction))
        {
            t.FactionForces[faction] -= amount;
            if (t.FactionForces[faction] <= 0) t.FactionForces.Remove(faction);
            
            // Refund to tanks? Yes.
            var fState = game.State.Factions.First(f => f.Faction == faction);
            fState.ForcesInTanks += amount;
        }
    }
    
    private void ClearForces(Game game, string territoryName, Faction faction)
    {
         var t = game.State.Map.Territories.First(x => x.Name == territoryName);
         if (t.FactionForces.ContainsKey(faction))
         {
             int amount = t.FactionForces[faction];
             t.FactionForces.Remove(faction);
             
             // Refund
             var fState = game.State.Factions.First(f => f.Faction == faction);
             fState.ForcesInTanks += amount;
         }
    }

    private async Task EndGameAsync(Game game)
    {
        // Delete channels
        await _discordService.DeleteGameChannelsAsync(game.GuildId, game.CategoryId);
        // Delete DB
        await _repository.DeleteGameAsync(game.Id);
        // Note: We can't post an update because channels are gone.
    }

    private async Task PostGameUpdate(Game game)
    {
        var content = _renderer.Render(game.State);
        await _discordService.SendMapUpdateAsync(game.GuildId, game.MapChannelId, content);

        // Send Interactive Phase Button
        string message = $"**Round {game.State.Turn}: {game.State.Phase} Phase**\nUse the button below to advance.";
        string btnLabel;
        
        // Determine label based on current phase
        if (game.State.Phase == GamePhase.MentatPause)
        {
            btnLabel = "End Round";
        }
        else
        {
            // Predict next phase for the label
            GamePhase next = (game.State.Phase == GamePhase.Setup) ? GamePhase.Storm : game.State.Phase + 1;
            btnLabel = $"Next Phase: {next}";
        }

        await _discordService.SendActionMessageAsync(game.GuildId, game.ActionsChannelId, message, btnLabel, $"next-phase:{game.Id}");
    }
}
