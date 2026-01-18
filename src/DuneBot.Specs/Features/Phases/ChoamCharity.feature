Feature: CHOAM Charity Phase
  In order to ensure all players have minimum spice
  As the Game Engine
  I want to provide charity to poor factions

  Background:
     Given the game is in the "ChoamCharity" phase

  Scenario: Faction with less than 2 spice receives charity
    Given "Atreides" has 0 spice
    When the CHOAM charity is applied
    Then "Atreides" should have 2 spice

  Scenario: Faction with 1 spice receives 1 spice charity
    Given "Harkonnen" has 1 spice
    When the CHOAM charity is applied
    Then "Harkonnen" should have 2 spice

  Scenario: Faction with 2 or more spice receives no charity
    Given "Guild" has 5 spice
    When the CHOAM charity is applied
    Then "Guild" should have 5 spice
