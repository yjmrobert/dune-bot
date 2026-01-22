using System.Collections.Generic;

namespace DuneBot.Domain.Interfaces;

public interface IDeckService
{
    List<string> GetTreacheryDeck();
    List<string> GetSpiceDeck();
    List<string> GetTraitorDeck();
    void Shuffle(List<string> deck);
    string? Draw(List<string> deck, List<string> discard);
}
