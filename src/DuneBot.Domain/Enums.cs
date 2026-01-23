namespace DuneBot.Domain;

public enum Faction
{
    None = 0,
    Atreides,
    Harkonnen,
    Fremen,
    Emperor,
    Guild,
    BeneGesserit
}

public enum GamePhase
{
    Setup = 0,
    Storm,
    SpiceBlow,
    Nexus,
    ChoamCharity,
    Bidding,
    Revival,
    ShipmentAndMovement,
    Battle,
    SpiceCollection,
    MentatPause, // Optional pause if needed
    Ended
}
