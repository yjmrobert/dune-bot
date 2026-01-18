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

  Scenario: Fremen match native immunity
    Given the current storm position is sector 1
    And the following forces are in "Sietch Tabr" (Sector 1):
      | Faction | Forces |
      | Fremen  | 10     |
    And the following forces are in "Imperial Basin (S1)" (Sector 1):
      | Faction | Forces |
      | Fremen  | 5      |
    When the storm moves 0 sectors
    # Testing logic: Storm hits current sector if it doesn't move? 
    # Actually, storm logic is: Move N, sweep sectors from Start+1 to Start+N.
    # So if start is 1, move 1 -> hits 2.
    # Let's adjust: Start 18, Move 1 -> Hits 1.
    
  Scenario: Fremen survive storm in open sand
    Given the current storm position is sector 18
    And the following forces are in "Imperial Basin (S1)" (Sector 1):
      | Faction | Forces |
      | Fremen  | 5      |
    When the storm moves 1 sectors
    Then "Fremen" should have 5 forces in "Imperial Basin (S1)"
