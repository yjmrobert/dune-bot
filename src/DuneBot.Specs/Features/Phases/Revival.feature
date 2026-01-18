Feature: Revival Phase
  In order to bring back dead leaders and forces
  As a Player
  I want to revive units from my tanks

  Background:
     Given the game is in the "Revival" phase

  Scenario: Revive leader from tanks
    Given "Atreides" has 10 spice
    And "Atreides" has "Duncan" in their dead leaders
    When "Atreides" revives leader "Duncan"
    Then "Atreides" should have 8 spice
    And "Atreides" should not have "Duncan" in their dead leaders

  Scenario: Revive forces from tanks
    Given "Harkonnen" has 10 spice
    And "Harkonnen" has 0 forces in reserves
    And "Harkonnen" has 10 forces in tanks
    When "Harkonnen" revives 3 forces
    Then "Harkonnen" should have 4 spice
    # Cost: 2 spice per force * 3 = 6 spice. 10 - 6 = 4.
    And "Harkonnen" should have 3 forces in reserves
    And "Harkonnen" should have 7 forces in tanks


  Scenario: Cannot revive without enough spice
    Given "Atreides" has 1 spice
    And "Atreides" has "Duncan" in their dead leaders
    When "Atreides" revives leader "Duncan"
    Then the action should fail with message "Not enough spice"
