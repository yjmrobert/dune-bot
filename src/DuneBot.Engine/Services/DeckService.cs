using System;
using System.Collections.Generic;
using System.Linq;
using DuneBot.Domain.Interfaces;

namespace DuneBot.Engine.Services;

public class DeckService : IDeckService
{
    private readonly Random _random = new Random();

    public List<string> GetTreacheryDeck()
    {
        // Full list of Treachery Cards
        var deck = new List<string>
        {
            "Lasgun", "Chaumusky", "Ellaca Drug", "Gom Jabbar", "Hajr", "Kulon",
            "Maula Pistol", "Shield", "Snooper", "Stunner", "Tleilaxu Ghola",
            "Truthtrance", "Weather Control", "Family Atomics",

            // Weapons
            "Crysknife", "Hunter-Seeker", "Slip Tip", "Stunner",

            // Defenses
            "Shield", "Shield", "Snooper", "Snooper",

            // Worthless
            "Baliset", "Jubba Cloak", "La La La", "Trip to Gamont",
            "Kulon", "Chaumusky"
        };
        // Note: Simplified distribution for MVP
        return deck;
    }

    public List<string> GetSpiceDeck()
    {
        // Territories that have Spice Blows
        return new List<string>
        {
            "Cielago South", "Cielago North", "South Mesa", "Red Chasm", "The Minor Erg",
            "Sihaya Ridge", "Old Gap", "Broken Land", "Hagga Basin", "Rock OutCroppings",
            "Funeral Plain", "The Great Flat", "Habbanya Erg", "Wind Pass North", "Habbanya Ridge Flat",
            "Shai-Hulud", "Shai-Hulud", "Shai-Hulud", "Shai-Hulud", "Shai-Hulud", "Shai-Hulud"
        };
    }

    public List<string> GetTraitorDeck()
    {
        // Traitors per faction
        return new List<string>
        {
            // Atreides
            "Duncan Idaho", "Gurney Halleck", "Lady Jessica", "Thufir Hawat", "Dr. Yueh",
            // Harkonnen
            "Feyd-Rautha", "Beast Rabban", "Piter de Vries", "Captain Iakin Nefud", "Umman Kudu",
            // Emperor
            "Bashar", "Burseg", "Caid", "Captain Aramsham", "Count Fenring",
            // Guild
            "Staban Tuek", "Esmar Tuek", "Master Bewt", "Sook Sook", "Guild Rep",
            // Fremen
            "Stilgar", "Chani", "Otheym", "Shadout Mapes", "Jamis",
            // BG
            "Alia", "Margot Fenring", "Princess Irulan", "Mother Ramallo", "Wanna Marcus"
        };
    }

    public void Shuffle(List<string> deck)
    {
        int n = deck.Count;
        while (n > 1)
        {
            n--;
            int k = _random.Next(n + 1);
            string value = deck[k];
            deck[k] = deck[n];
            deck[n] = value;
        }
    }

    public string? Draw(List<string> deck, List<string> discard)
    {
        if (deck.Count == 0)
        {
            if (discard.Count > 0)
            {
                // Reshuffle discard into deck
                deck.AddRange(discard);
                discard.Clear();
                Shuffle(deck);
            }
            else
            {
                return null; // Empty
            }
        }

        var card = deck[0];
        deck.RemoveAt(0);
        return card;
    }
}
