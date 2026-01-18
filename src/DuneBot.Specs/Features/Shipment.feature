Feature: Shipment Phase
  In order to deploy forces
  As a Player
  I want to ship forces to Arrakis

  Background:
     Given the game is in the "ShipmentAndMovement" phase

  Scenario: Shipment to Stronghold is cheaper
    Given "Atreides" has 10 spice
    And "Atreides" has 10 forces in reserves
    When "Atreides" ships 5 forces to "Arrakeen" (Sector 8)
    Then "Atreides" should have 5 spice
    # Cost: 1 spice/force * 5 = 5. (Arrakeen is Stronghold)

  Scenario: Shipment to Desert is expensive
    Given "Atreides" has 10 spice
    And "Atreides" has 10 forces in reserves
    When "Atreides" ships 5 forces to "Basin" (Sector 8)
    Then "Atreides" should have 0 spice
    # Cost: 2 spice/force * 5 = 10.

  Scenario: Unable to ship into Storm
    Given "Atreides" has 10 spice
    And "Atreides" has 10 forces in reserves
    And the storm is at sector 3
    When "Atreides" ships 5 forces to "Arrakeen" (Sector 3)
    Then the action should fail with message "Cannot ship into Storm."
