Feature: Revival Phase
    As a player
    I want to revive forces and leaders
    So that I can rebuild my army

  Background:
    Given a game in the "Revival" phase

  Scenario: Reviving free forces
    Given faction "Atreides" has 5 forces in tanks
    And "Atreides" has 0 spice
    When "Atreides" revives 2 forces
    Then "Atreides" should have 2 forces in reserves
    And "Atreides" should have 3 forces in tanks
    And "Atreides" should have 0 spice

  Scenario: Paying for additional forces
    Given faction "Emperor" has 5 forces in tanks
    And "Emperor" has 10 spice
    And "Emperor" has free revival limit of 1
    When "Emperor" revives 2 forces
    Then "Emperor" should have 2 forces in reserves
    And "Emperor" should have 8 spice (paid 2)

  Scenario: Cannot revive more than 3 forces
    Given faction "Atreides" has 10 forces in tanks
    When "Atreides" revives 4 forces
    Then the action should fail with "Cannot revive more than 3 forces"

  Scenario: Reviving a leader
    Given faction "Harkonnen" has leader "Feyd-Rautha" (Strength 6) in tanks
    And "Harkonnen" has 5 spice
    And all other "Harkonnen" leaders are in tanks
    When "Harkonnen" revives leader "Feyd-Rautha"
    Then the action should fail with "Not enough spice"

  Scenario: Successfully reviving a leader
    Given faction "Harkonnen" has leader "Feyd-Rautha" (Strength 6) in tanks
    And "Harkonnen" has 10 spice
    And all other "Harkonnen" leaders are in tanks
    When "Harkonnen" revives leader "Feyd-Rautha"
    Then "Harkonnen" should have 4 spice
    And leader "Feyd-Rautha" should be alive

  Scenario: Cannot revive leader if others alive
    Given faction "Atreides" has leader "Paul Atreides" in tanks
    And faction "Atreides" has leader "Duncan Idaho" alive
    When "Atreides" revives leader "Paul Atreides"
    Then the action should fail with "Cannot revive leader while others are alive"
