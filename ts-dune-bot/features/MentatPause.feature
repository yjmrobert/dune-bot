Feature: Mentat Pause Phase
  As a player
  I want the game to check for win conditions and reset for the next turn
  So that the game can progress or conclude

  Background:
    Given the game is in the "Mentat Pause" phase
    And faction "Atreides" exists with 0 spice and 0 reserves
    And faction "Harkonnen" exists with 0 spice and 0 reserves

  Scenario: No winner, advance turn
    Given the game is in Turn 1
    And "Atreides" controls "Arrakeen"
    And "Harkonnen" controls "Carthag"
    When the Mentat Pause is resolved
    Then the game should be in Turn 2
    And the phase should be "Storm"

  Scenario: Win Condition Met (3 Strongholds)
    # Standard 2-player game implies fewer strongholds needed? 
    # Usually 3 is standard. Let's assume 3 for simplicity.
    Given "Atreides" controls "Arrakeen"
    And "Atreides" controls "Carthag"
    And "Atreides" controls "Tuek's Sietch"
    When the Mentat Pause is resolved
    Then "Atreides" should be declared the winner

  Scenario: Turn 10 Limit Reached
    Given the game is in Turn 10
    And "Atreides" controls "Arrakeen"
    # Not enough to win
    When the Mentat Pause is resolved
    Then the game should be ended
