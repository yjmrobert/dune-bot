using System.Linq;
using DuneBot.Domain;
using DuneBot.Domain.Interfaces;
using DuneBot.Domain.State;

namespace DuneBot.Engine.Services;

public class GameMessageService : IGameMessageService
{
    public string GetWelcomeMessage(Game game)
    {
         var factionList = string.Join("\n", game.State.Factions.Select(f => $"- **{f.PlayerName}** ({f.Faction})"));
         return $"**Dune Game Lobby**\n**Players ({game.State.Factions.Count}/6):**\n{factionList}\n\nJoin the game and then start when ready.";
    }

    public string GetLobbyMessage(Game game)
    {
         var factionList = string.Join("\n", game.State.Factions.Select(f => $"- **{f.PlayerName}** ({f.Faction})"));
         return $"**Dune Game Lobby**\n**Players ({game.State.Factions.Count}/6):**\n{factionList}\n\nJoin the game and then start when ready.";
    }

    public string GetStormMessage(int move, int oldSector, int newSector)
    {
        return $"Storm moved {move} sectors from {oldSector} to {newSector}.";
    }

    public string GetSpiceBlowMessage(string card, int amount)
    {
        return $"Spice Blow in **{card}**! {amount} spice added.";
    }

    public string GetNexusMessage()
    {
        return "**NEXUS!** Alliances may be formed/broken.";
    }

    public string GetChoamCharityMessage(string playerName, int amount)
    {
        return $"**{playerName}** received {amount} spice from CHOAM Charity.";
    }

    public string GetShipmentPaymentMessage(string recipientName, string factionName)
    {
        return $"**{recipientName}** ({factionName}) received shipment payment.";
    }

    public string GetShipmentMessage(string playerName, int amount, string territoryName, int cost)
    {
        return $"**{playerName}** shipped {amount} forces to **{territoryName}** for {cost} spice.";
    }

    public string GetMovementMessage(string playerName, int amount, string from, string to)
    {
        return $"**{playerName}** moved {amount} forces from **{from}** to **{to}**.";
    }

    public string GetBattleMessage(string territory, string p1, string p2)
    {
         return $"**BATTLE** in **{territory}**! **{p1}** vs **{p2}**.";
    }

    public string GetWinMessage(string winnerName, int strongholds)
    {
        return $"**GAME OVER!**\n**{winnerName}** wins with {strongholds} strongholds!";
    }

    public string GetRevivalMessage(string playerName, int amount)
    {
        return $"**{playerName}** revived {amount} forces to reserves.";
    }

    public string GetReviveLeaderMessage(string playerName, string leaderName)
    {
        return $"**{playerName}** revived leader **{leaderName}**.";
    }
}
