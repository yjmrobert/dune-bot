Feature: Battle Resolution
  In order to resolve conflicts
  As a Game Engine
  I want to determine the winner of a battle based on leaders, weapons, and defenses

  Scenario: Basic Battle Winner
    Given the following factions are in a battle in "Arrakeen":
      | Faction   | Leader   | Strength | Weapon | Defense | Dial |
      | Atreides  | Duncan   | 5        | None   | None    | 1    |
      | Harkonnen | Beast    | 5        | None   | None    | 5    |
    When the battle is resolved
    Then the winner should be "Harkonnen"
    And "Atreides" should lose all forces in "Arrakeen"
