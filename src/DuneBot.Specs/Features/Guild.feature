Feature: Guild Faction
  In order to profit from the war
  As the Guild Faction
  I want to collect payments for shipments

  Background:
     Given the game is in the "ShipmentAndMovement" phase

  Scenario: Guild receives payments when others ship
    Given "Atreides" has 10 spice
    And "Guild" has 0 spice
    And "Atreides" has 5 forces in reserves
    When "Atreides" ships 5 forces to "Basin" (Sector 8)
    Then "Atreides" should have 0 spice
    And "Guild" should have 10 spice
    # Cost: 2 spice/force (Generic territory). 5*2=10.

  Scenario: Guild pays half for shipment
    Given "Guild" has 10 spice
    And "Guild" has 6 forces in reserves
    When "Guild" ships 6 forces to "Basin" (Sector 8)
    Then "Guild" should have 4 spice
    # Cost: 6*2 = 12. Half is 6. 10-6=4.
