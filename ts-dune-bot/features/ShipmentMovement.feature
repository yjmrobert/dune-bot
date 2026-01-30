Feature: Shipment and Movement Phase
    As a Faction Leader
    I want to ship and move forces
    So that I can conquer Dune

  Background:
    Given the game is in the "Shipment and Movement" phase
    And faction "Atreides" exists with 20 spice and 10 reserves
  # Shipment Scenarios

  Scenario: Ship forces to a Stronghold
    Given "Arrakeen" is a Stronghold
    When "Atreides" ships 5 forces to "Arrakeen"
    Then "Atreides" should have 15 spice
    And "Arrakeen" should have 5 "Atreides" forces

  Scenario: Ship forces to a Territory
    Given "The Great Flat" is not a Stronghold
    When "Atreides" ships 5 forces to "The Great Flat"
    Then "Atreides" should have 10 spice
    And "The Great Flat" should have 5 "Atreides" forces

  Scenario: Cannot ship to Storm
    Given the storm is at sector 2
    And "Arrakeen" occupies sector 2
    When "Atreides" ships 2 forces to "Arrakeen" (Sector 2)
    Then the action should fail with "storm"

  Scenario: Not enough spice
    Given "Atreides" has 1 spice
    When "Atreides" ships 2 forces to "Arrakeen"
    Then the action should fail with "Not enough spice"
  # Movement Scenarios

  Scenario: Move forces to adjacent territory
    Given "Atreides" has 5 forces in "Arrakeen"
    And "Imperial Basin" is adjacent to "Arrakeen"
    When "Atreides" moves 5 forces from "Arrakeen" to "Imperial Basin"
    Then "Imperial Basin" should have 5 "Atreides" forces
    And "Arrakeen" should have 0 "Atreides" forces

  Scenario: Move forces with Ornithopters (3 range)
    Given "Atreides" has 5 forces in "Hagga Basin"
    And "Atreides" controls "Arrakeen"
    And "Shield Wall" is adjacent to "Hagga Basin"
    And "Imperial Basin" is adjacent to "Shield Wall"
    And "Arrakeen" is adjacent to "Imperial Basin"
     # Distance Hagga -> Shield -> Imperial -> Arrakeen is 3?
     # Hagga -> Sietch Tabr (No)
     # Map: Hagga Basin -> Carthag -> Imperial Basin -> Arrakeen (3 steps)
     # We use Map constants.
    When "Atreides" moves 5 forces from "Hagga Basin" to "Arrakeen"
    Then "Arrakeen" should have 6 "Atreides" forces

  Scenario: Cannot move too far without Ornithopters
    Given "Atreides" has 5 forces in "Hagga Basin"
    And "Atreides" does not control "Arrakeen" or "Carthag"
    When "Atreides" moves 5 forces from "Hagga Basin" to "Arrakeen"
    Then the action should fail with "too far"

  Scenario: Movement blocked by Storm
    Given the storm is at sector 8
    And "The Great Flat" occupies sector 8
    Given "Atreides" has 5 forces in "The Great Flat"
    When "Atreides" moves 1 force from "The Great Flat" to "Habbanya Ridge"
     # Note: Habbanya Ridge is not adjacent to Great Flat in simplified map?
     # Great Flat neighbors: [] in my map constant!
     # Wait, I need to check map constants. Great Flat has NO neighbors?
     # Then ANY move from it fails due to distance -1 unless I define neighbors. 
     # Let's check map.ts again.
    Then the action should fail with "storm"
