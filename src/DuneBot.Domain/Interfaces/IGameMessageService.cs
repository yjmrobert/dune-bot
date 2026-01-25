using DuneBot.Domain.State;

namespace DuneBot.Domain.Interfaces;

public interface IGameMessageService
{
    string GetWelcomeMessage(Game game);
    string GetLobbyMessage(Game game);
    string GetStormMessage(int move, int oldSector, int newSector);
    string GetSpiceBlowMessage(string card, int amount);
    string GetNexusMessage();
    string GetChoamCharityMessage(string playerName, int amount);
    string GetChoamCharityPromptMessage();
    string GetShipmentPaymentMessage(string recipientName, string factionName);
    string GetShipmentMessage(string playerName, int amount, string territoryName, int cost);
    string GetMovementMessage(string playerName, int amount, string from, string to);
    string GetBattleMessage(string territory, string p1, string p2);
    string GetWinMessage(string winnerName, int strongholds);
    string GetRevivalMessage(string playerName, int amount);
    string GetReviveLeaderMessage(string playerName, string leaderName);
}
