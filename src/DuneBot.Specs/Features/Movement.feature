Feature: Movement Phase
  In order to conquer Arrakis
  As a Player
  I want to move my forces between territories

  Background:
     Given the game is in the "ShipmentAndMovement" phase

  Scenario: Move to adjacent territory (Distance 1)
    Given "Atreides" has 10 forces in "Arrakeen"
    When "Atreides" moves 5 forces from "Arrakeen" to "Imperial Basin (S3)"
    Then "Atreides" should have 5 forces in "Arrakeen"
    And "Atreides" should have 5 forces in "Imperial Basin (S3)"

  Scenario: Move 2 spaces with Ornithopters (Control Arrakeen)
    Given "Atreides" has 10 forces in "Arrakeen"
    When "Atreides" moves 5 forces from "Arrakeen" to "Imperial Basin (S1)"
    # Path: Arrakeen -> Imperial Basin (S2) -> Imperial Basin (S1). Dist 2.
    # Control Arrakeen assigns Ornithopters (Move 3).
    Then "Atreides" should have 5 forces in "Imperial Basin (S1)"

  Scenario: Move 2 spaces without Ornithopters (Fail)
    Given "Atreides" has 10 forces in "Sietch Tabr"
    # Sietch Tabr does not grant Ornithopters.
    When "Atreides" moves 5 forces from "Sietch Tabr" to "Imperial Basin (S1)"
    # Path: Tabr -> Shield Wall (S1) -> Imperial Basin (S1). Dist 2. Max 1.
    Then the action should fail with message "Destination unreachable"

  Scenario: Fremen move 2 spaces without Ornithopters (Pass)
    Given "Fremen" has 10 forces in "Sietch Tabr"
    When "Fremen" moves 5 forces from "Sietch Tabr" to "Imperial Basin (S1)"
    Then "Fremen" should have 5 forces in "Imperial Basin (S1)"

  Scenario: Cannot move into Storm
    Given "Atreides" has 10 forces in "Arrakeen"
    And the storm is at sector 2
    # Imperial Basin (S2) is at Sector 2. Path to S1 goes through S2? No, direct connect?
    # MapService: Connect("Imperial Basin (S1)", "Imperial Basin (S2)"); Connect("Imperial Basin (S2)", "Arrakeen");
    # So to go Arrakeen -> Imperial Basin (S2), destination is in storm.
    When "Atreides" moves 5 forces from "Arrakeen" to "Imperial Basin (S2)"
    Then the action should fail with message "Cannot move through Storm"
