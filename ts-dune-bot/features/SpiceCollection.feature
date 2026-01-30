Feature: Spice Collection Phase
  As a player
  I want to collect spice from territories I occupy
  So that I can fund my operations

  Background:
    Given the game is in the "Spice Collection" phase
    And faction "Atreides" exists with 0 spice and 0 reserves
    And faction "Harkonnen" exists with 0 spice and 0 reserves

  Scenario: Standard Collection (2 per force)
    Given "Atreides" has 5 forces in "Hagga Basin"
    And "Hagga Basin" has 20 Spice
    And "Atreides" does not control "Arrakeen" or "Carthag"
    When spice collection is resolved
    Then "Atreides" should have 10 spice
    And "Hagga Basin" should have 10 Spice

  Scenario: Bonus Collection (3 per force with Stronghold control)
    Given "Atreides" has 5 forces in "Hagga Basin"
    And "Hagga Basin" has 20 Spice
    And "Atreides" controls "Arrakeen"
    When spice collection is resolved
    Then "Atreides" should have 15 spice
    And "Hagga Basin" should have 5 Spice

  Scenario: Collection Limit (Territory runs out)
    Given "Atreides" has 10 forces in "Hagga Basin"
    And "Hagga Basin" has 5 Spice
    And "Atreides" does not control "Arrakeen" or "Carthag"
    When spice collection is resolved
    Then "Atreides" should have 5 spice
    And "Hagga Basin" should have 0 Spice

  Scenario: Multiple Factions Collecting
    Given "Atreides" has 2 forces in "Hagga Basin"
    And "Hagga Basin" has 20 Spice
    # Note: Usually only one faction can be in a territory unless Battle phase?
    # Actually, after Battle, only one remains.
    # But if they are co-existing (e.g. Bene Gesserit spiritual advisors - NOT IMPLEMENTED YET)
    # For now, let's test separate territories.
    And "Harkonnen" has 2 forces in "Imperial Basin"
    And "Imperial Basin" has 10 Spice
    When spice collection is resolved
    Then "Atreides" should have 4 spice
    And "Harkonnen" should have 4 spice
