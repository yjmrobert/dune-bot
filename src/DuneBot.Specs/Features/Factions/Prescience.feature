Feature: Atreides Prescience in Battle
  In order to gain advantage in combat
  As Atreides
  I want to see opponent's battle plan elements

  Background:
     Given the game is in the "Battle" phase
     And there is an active battle in "Arrakeen"

  Scenario: Atreides reveals opponent's leader
    Given "Atreides" is in the battle
    And "Harkonnen" is in the battle
    When "Atreides" uses Prescience to reveal "Leader"
    And "Harkonnen" submits battle plan with leader "Feyd-Rautha"
    Then "Atreides" should receive DM revealing "Feyd-Rautha"

  Scenario: Atreides reveals opponent's dial
    Given "Atreides" is in the battle
    And "Fremen" is in the battle
    When "Atreides" uses Prescience to reveal "Dial"
    And "Fremen" submits battle plan with dial 7
    Then "Atreides" should receive DM revealing "7"

  Scenario: Atreides reveals opponent's weapon
    Given "Atreides" is in the battle
    And "Guild" is in the battle
    When "Atreides" uses Prescience to reveal "Weapon"
    And "Guild" submits battle plan with weapon "Lasgun"
    Then "Atreides" should receive DM revealing "Lasgun"

  Scenario: Atreides reveals opponent's defense
    Given "Atreides" is in the battle
    And "Emperor" is in the battle
    When "Atreides" uses Prescience to reveal "Defense"
    And "Emperor" submits battle plan with defense "Shield"
    Then "Atreides" should receive DM revealing "Shield"

  Scenario: Cannot use Prescience twice in same battle
    Given "Atreides" is in the battle
    And "Harkonnen" is in the battle
    When "Atreides" uses Prescience to reveal "Leader"
    And "Atreides" uses Prescience to reveal "Dial"
    Then the action should fail with message "Prescience already used"

  Scenario: Only Atreides can use Prescience
    Given "Harkonnen" is in the battle
    And "Atreides" is in the battle
    When "Harkonnen" uses Prescience to reveal "Leader"
    Then the action should fail with message "Only Atreides can use Prescience"
