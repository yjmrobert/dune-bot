using System;
using System.Linq;
using System.Threading.Tasks;
using DuneBot.Domain;
using DuneBot.Domain.Interfaces;
using DuneBot.Domain.State;

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
        var card = _deckService.Draw(game.State.SpiceDeck, game.State.SpiceDiscard);
        if (card == null)
        {
            game.State.ActionLog.Add("Spice Blow: No cards left!");
            // return GamePhase.ChoamCharity; // Removed return
            return GamePhase.ChoamCharity; 
        }

        game.State.ActionLog.Add($"Spice Blow: Drawn **{card}**.");

        if (card == "Shai-Hulud")
        {
            game.State.ActionLog.Add(_messageService.GetNexusMessage());
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
                int spiceAmount = (territory.Name == "Broken Land" || territory.Name == "South Mesa" ||
                                   territory.Name == "The Great Flat")
                    ? 10
                    : 6;
                // Add spice
                territory.SpiceBlowAmount += spiceAmount;
                game.State.ActionLog.Add(_messageService.GetSpiceBlowMessage(card, spiceAmount));
            }

            // Discard
            game.State.SpiceDiscard.Add(card);

            return GamePhase.ChoamCharity; // Skip Nexus
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
