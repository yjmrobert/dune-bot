Feature: Emperor Faction
  In order to leverage my immense wealth
  As the Emperor Faction
  I want to collect payments from other factions

  Scenario: Emperor receives payments
    Given a game with 4 factions: Atreides, Harkonnen, Emperor, Fremen
    And the game is in the "Bidding" phase
    And "Atreides" has 10 spice
    And "Emperor" has 0 spice
    When the Bidding Phase starts
    And "Atreides" places a bid of 5
    And "Harkonnen" passes
    And "Emperor" passes
    And "Fremen" passes
    Then "Atreides" should win the auction
    And "Emperor" should have 5 spice
