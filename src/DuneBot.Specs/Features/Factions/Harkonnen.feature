Feature: Harkonnen Faction
  In order to crush my enemies
  As the Harkonnen Faction
  I want to use treachery to win battles

  Background:
    Given the game is in the "Battle" phase

  Scenario: Harkonnen captures a leader
    Given the following factions are in a battle in "Arrakeen":
      | Faction   | Leader | Dial | Weapon | Defense |
      | Harkonnen | Beast  |   10 | None   | None    |
      | Atreides  | Duncan |    3 | None   | None    |
    And "Harkonnen" has 5 spice
    When the battle is resolved
    Then the winner should be "Harkonnen"
    And "Harkonnen" should have captured "Duncan"

  Scenario: Harkonnen uses a traitor
    Given the following factions are in a battle in "Carthag":
      | Faction   | Leader | Dial | Weapon | Defense |
      | Harkonnen | Beast  |    1 | None   | None    |
      | Atreides  | Duncan |   10 | None   | None    |
    And "Harkonnen" has a traitor called "Duncan"
    When the battle is resolved
    Then the winner should be "Harkonnen"
