Feature: Fremen Faction
  In order to survive and thrive on Arrakis
  As the Fremen Faction
  I want to use my native abilities to withstand the storm

  Scenario: Fremen survive storm in open sand
    Given the current storm position is sector 3
    And the following forces are in "Broken Land" (Sector 4):
      | Faction | Forces |
      | Fremen  | 5      |
    When the storm moves 1 sectors
    Then "Fremen" should have 5 forces in "Broken Land"
