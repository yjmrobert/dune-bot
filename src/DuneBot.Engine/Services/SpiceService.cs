using System;
using System.Linq;
using System.Threading.Tasks;
using DuneBot.Domain;
using DuneBot.Domain.Interfaces;
using DuneBot.Domain.State;
using System.Collections.Generic;

namespace DuneBot.Engine.Services;

public class SpiceService : ISpiceService
{
    private readonly IDeckService _deckService;
    private readonly IGameMessageService _messageService;

    public SpiceService(IDeckService deckService, IGameMessageService messageService)
    {
        _deckService = deckService;
        _messageService = messageService;
    }

    public GamePhase ResolveSpiceBlow(Game game)
    {
        bool nexusOccurred = false;
        
        while (true)
        {
            var card = _deckService.Draw(game.State.SpiceDeck, game.State.SpiceDiscard);
            if (card == null)
            {
                game.State.ActionLog.Add("Spice Blow: No cards left!");
                return nexusOccurred && game.State.Turn > 1 ? GamePhase.Nexus : GamePhase.ChoamCharity;
            }

            game.State.ActionLog.Add($"Spice Blow: Drawn **{card}**.");

            if (card == "Shai-Hulud")
            {
                game.State.ActionLog.Add(_messageService.GetNexusMessage());
                
                // Handle Shai-Hulud effect:
                // "All spice and forces in the territory shown on the card now face up in the discard pile are removed"
                // The "fail" pile is the existing discard pile *before* we add Shai-Hulud.
                var lastTerritoryCard = game.State.SpiceDiscard.LastOrDefault();
                
                if (lastTerritoryCard != null && lastTerritoryCard != "Shai-Hulud")
                {
                    var territory = game.State.Map.Territories.FirstOrDefault(t => t.Name == lastTerritoryCard);
                    if (territory != null)
                    {
                        // Remove Spice
                        if (territory.SpiceBlowAmount > 0)
                        {
                            game.State.ActionLog.Add($"**Shai-Hulud** devours {territory.SpiceBlowAmount} spice in **{territory.Name}**!");
                            territory.SpiceBlowAmount = 0;
                        }

                        // Remove Forces
                        var factions = territory.FactionForces.Keys.ToList();
                        foreach (var fType in factions)
                        {
                             // Fremen are safe from Shai-Hulud (usually, check rules. "Fremen forces are not devoured by Shai-Hulud")
                             // Rulebook: "Fremen forces are never devoured by Shai-Hulud... they may ride the worm." 
                             // We will implement "Devour" first, assume non-Fremen die.
                             if (fType == Faction.Fremen) 
                             {
                                 game.State.ActionLog.Add($"**Fremen** ride the worm in **{territory.Name}**!");
                                 continue;
                             }
                             
                             int count = territory.FactionForces[fType];
                             if (count > 0)
                             {
                                 var faction = game.State.Factions.First(f => f.Faction == fType);
                                 faction.ForcesInTanks += count;
                                 territory.FactionForces.Remove(fType);
                                 game.State.ActionLog.Add($"**Shai-Hulud** devours {count} {faction.PlayerName} forces in **{territory.Name}**!");
                             }
                        }
                    }
                }

                nexusOccurred = true;
                
                // Discard Shai-Hulud and continue loop
                game.State.SpiceDiscard.Add(card);
                continue; 
            }
            else
            {
                // It's a territory
                
                // Check Storm
                var territory = game.State.Map.Territories.FirstOrDefault(t => t.Name == card);
                if (territory != null)
                {
                    bool inStorm = territory.Sector == game.State.StormLocation;
                    
                    if (inStorm)
                    {
                         game.State.ActionLog.Add($"Spice Blow in **{card}** is swallowed by the **Storm**! No spice added.");
                    }
                    else
                    {
                        int spiceAmount = (territory.Name == "Broken Land" || territory.Name == "South Mesa" ||
                                           territory.Name == "The Great Flat")
                            ? 10
                            : 6; // Simplification
                            
                         // Add spice
                        territory.SpiceBlowAmount += spiceAmount;
                        game.State.ActionLog.Add(_messageService.GetSpiceBlowMessage(card, spiceAmount));
                    }
                }

                // Discard
                game.State.SpiceDiscard.Add(card);

                // Stop drawing
                return nexusOccurred && game.State.Turn > 1 ? GamePhase.Nexus : GamePhase.ChoamCharity;
            }
        }
    }

    public void CollectSpice(Game game)
    {
        foreach (var t in game.State.Map.Territories.Where(t => t.SpiceBlowAmount > 0))
        {
            if (t.FactionForces.Keys.Count == 1) // Only if uncontested
            {
                var factionType = t.FactionForces.Keys.First();
                var count = t.FactionForces[factionType];
                var collectionRate = 2;

                int potentialCollection = count * collectionRate;
                int actuallyCollected = Math.Min(t.SpiceBlowAmount, potentialCollection);

                if (actuallyCollected > 0)
                {
                    t.SpiceBlowAmount -= actuallyCollected;

                    var factionState = game.State.Factions.FirstOrDefault(f => f.Faction == factionType);
                    if (factionState != null)
                    {
                        factionState.Spice += actuallyCollected;
                        game.State.ActionLog.Add(
                            $"**{factionState.PlayerName}** collected {actuallyCollected} spice from {t.Name}.");
                    }
                }
            }
            else if (t.FactionForces.Keys.Count > 1)
            {
                game.State.ActionLog.Add($"Spice in **{t.Name}** is contested! No collection.");
            }
        }
    }
}
