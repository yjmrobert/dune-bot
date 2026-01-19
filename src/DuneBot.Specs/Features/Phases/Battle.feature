Feature: Battle Resolution
  In order to resolve conflicts
  As a Game Engine
  I want to determine the winner of a battle based on leaders, weapons, and defenses

  Scenario: Basic Battle Winner
    Given the game is in the "Battle" phase
    Given the following factions are in a battle in "Arrakeen":
      | Faction   | Leader   | Strength | Weapon | Defense | Dial |
      | Atreides  | Duncan   | 5        | None   | None    | 1    |
      | Harkonnen | Beast    | 5        | None   | None    | 5    |
    When the battle is resolved
    Then the winner should be "Harkonnen"
    And "Atreides" should lose all forces in "Arrakeen"

  Scenario: Cheap Hero - Win with 0 dial
    Given the game is in the "Battle" phase
    Given the following factions are in a battle in "Carthag":
      | Faction   | Leader        | Strength | Weapon | Defense | Dial |
      | Atreides  | Duncan        | 5        | None   | None    | 0    |
      | Harkonnen | Feyd-Rautha   | 5        | None   | None    | 5    |
    When the battle is resolved
    Then the winner should be "Atreides"
    And "Duncan" should be in dead leaders for "Atreides"
    And "Atreides" should have won with 0 force loss

  Scenario: Both players use Cheap Hero - Tie
    Given the game is in the "Battle" phase
    Given the following factions are in a battle in "Old Gap":
      | Faction  | Leader              | Strength | Weapon | Defense | Dial |
      | Guild    | Guild Representative| 5        | None   | None    | 0    |
      | Emperor  | Bashar              | 5        | None   | None    | 0    |
    When the battle is resolved
    Then the battle should result in a tie
    And "Guild Representative" should be in dead leaders for "Guild"
    And "Bashar" should be in dead leaders for "Emperor"

  Scenario: Cheap Hero overrides normal strength
    Given the game is in the "Battle" phase  
    Given the following factions are in a battle in "Arrakeen":
      | Faction   | Leader   | Strength | Weapon | Defense | Dial |
      | Fremen    | Stilgar  | 5        | None   | None    | 0    |
      | Atreides  | Duncan   | 5        | None   | None    | 10   |
    When the battle is resolved
    Then the winner should be "Fremen"
    And "Stilgar" should be in dead leaders for "Fremen"
