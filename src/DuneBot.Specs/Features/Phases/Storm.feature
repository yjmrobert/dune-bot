Feature: Storm Phase
  In order to simulate the harsh environment of Arrakis
  As a Game Engine
  I want the storm to move blindly and destroy exposed forces

  Scenario: First Storm moves randomly from Sector 18
    Given a new game is starting
    When the First Storm occurs
    Then the new storm position should be between 1 and 18

  Scenario: Subsequent Storm moves between 1 and 10 sectors
    Given the current storm position is sector 2
    And the game is in Turn 2
    When the storm moves
    Then the new storm position should be between 3 and 12

  Scenario: Storm destroys forces in open sand
    Given the current storm position is sector 2
    And the following forces are in "Old Gap" (Sector 3):
      | Faction   | Forces |
      | Atreides  |      5 |
      | Harkonnen |      3 |
    When the storm moves 1 sectors
    Then "Atreides" should have 0 forces in "Old Gap"
    And "Harkonnen" should have 0 forces in "Old Gap"
    And "Atreides" should represent 5 forces in the tanks
    And "Harkonnen" should represent 3 forces in the tanks

  Scenario: Storm removes Spice from sand sectors
    Given the current storm position is sector 2
    And "Old Gap" (Sector 3) has 5 Spice
    When the storm moves 1 sectors
    Then "Old Gap" should have 0 Spice

  Scenario: Forces in Safe Zones survive
    Given the current storm position is sector 1
    And the following forces are in "Arrakeen" (Sector 2):
      | Faction  | Forces |
      | Atreides |      5 |
    When the storm moves 1 sectors
    Then "Atreides" should have 5 forces in "Arrakeen"

  Scenario: First Player is determined by Storm position
    Given the players are seated as follows:
      | Faction   |
      | Atreides  |
      | Harkonnen |
      | Fremen    |
    When the storm moves to sector 15
    Then the First Player should be "Atreides"
