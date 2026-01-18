Feature: Storm Phase
  In order to simulate the harsh environment of Arrakis
  As a Game Engine
  I want the storm to move blindly and destroy exposed forces

  Scenario: Storm moves randomly
    Given the current storm position is sector 18
    When the storm moves 2 sectors
    Then the new storm position should be sector 2

  Scenario: Storm destroys forces in open sand
    Given the current storm position is sector 2
    And the following forces are in "Old Gap" (Sector 3):
      | Faction   | Forces |
      | Atreides  | 5      |
      | Harkonnen | 3      |
    When the storm moves 1 sectors
    Then "Atreides" should have 0 forces in "Old Gap"
    And "Harkonnen" should have 0 forces in "Old Gap"
    And "Atreides" should represent 5 forces in the tanks
    And "Harkonnen" should represent 3 forces in the tanks

  Scenario: Forces in Safe Zones survive
    Given the current storm position is sector 1
    And the following forces are in "Arrakeen" (Sector 2):
      | Faction   | Forces |
      | Atreides  | 5      |
    When the storm moves 1 sectors
    Then "Atreides" should have 5 forces in "Arrakeen"

  Scenario: Fremen survive storm in open sand
    Given the current storm position is sector 3
    And the following forces are in "Broken Land" (Sector 4):
      | Faction | Forces |
      | Fremen  | 5      |
    When the storm moves 1 sectors
    Then "Fremen" should have 5 forces in "Broken Land"
