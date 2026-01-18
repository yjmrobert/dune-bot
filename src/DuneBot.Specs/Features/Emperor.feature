Feature: Emperor Faction
  In order to leverage my immense wealth
  As the Emperor Faction
  I want to collect payments from other factions

  Scenario: Emperor receives payments
    Given the "Emperor" is in the game with 0 spice
    And the "Atreides" faction has 10 spice
    And "Atreides" wins the auction for 5 spice
    When the auction is resolved
    Then "Emperor" should have 5 spice
