Feature: Spice Collection Phase
  In order to harvest spice from territories
  As a Player
  I want to collect spice from territories I control

  Background:
     Given the game is in the "SpiceCollection" phase

  Scenario: Collect spice from uncontested territory
    Given "Atreides" has 5 forces in "The Great Flat"
    And territory "The Great Flat" contains 10 spice
    When spice collection is resolved
    Then "Atreides" should have 10 spice
    # Collection rate: 2 spice per force. 5 forces * 2 = 10 spice collected.
    And "The Great Flat" should have 0 spice remaining

  Scenario: Partial spice collection when not enough spice
    Given "Harkonnen" has 10 forces in "Broken Land"
    And territory "Broken Land" contains 6 spice
    When spice collection is resolved
    Then "Harkonnen" should have 6 spice
    # 10 forces could collect 20 spice, but only 6 available
    And "Broken Land" should have 0 spice remaining

  Scenario: No collection from contested territory
    Given "Atreides" has 5 forces in "Red Chasm"
    And "Harkonnen" has 3 forces in "Red Chasm"
    And territory "Red Chasm" contains 10 spice
    When spice collection is resolved
    Then "Atreides" should have 0 spice
    And "Harkonnen" should have 0 spice
    And "Red Chasm" should have 10 spice remaining
    # Contested - no faction collects
