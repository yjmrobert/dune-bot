Feature: Spice Phase
  In order to gain resources
  As the Game Engine
  I want to spawn spice in territories

  Background:
    Given the game is in the "Storm" phase

  Scenario: Spice Blow A adds spice
    Given the next spice card A is "The Great Flat"
    When the spice blow is resolved
    Then territory "The Great Flat" should have 10 spice

  Scenario: Spice Blow obstructed by Storm
    Given the next spice card A is "The Great Flat"
    And "The Great Flat" is in the storm
    When the spice blow is resolved
    Then territory "The Great Flat" should have 0 spice

  Scenario: Shai-Hulud destroys forces and spice
    Given the discard pile has "Cielago Depression" on top
    And territory "Cielago Depression" has 5 spice
    And "Atreides" has 3 forces in "Cielago Depression"
    And the next spice card A is "Shai-Hulud"
    And the next spice card B is "The Great Flat"
    When the spice blow is resolved
    Then territory "Cielago Depression" should have 0 spice
    And "Atreides" should have 0 forces in "Cielago Depression"
    And territory "The Great Flat" should have 10 spice

  Scenario: Double Shai-Hulud causes multiple discards
    Given the next spice card A is "Shai-Hulud"
    And the next spice card B is "Shai-Hulud"
    And the next spice card C is "Broken Land"
    When the spice blow is resolved
    Then territory "Broken Land" should have 10 spice
    And the spice discard pile should contain "Shai-Hulud"

  Scenario: Nexus occurs after Shai-Hulud (Turn > 1)
    Given the game is in Turn 2
    And the next spice card A is "Shai-Hulud"
    And the next spice card B is "Broken Land"
    When the spice blow is resolved
    Then a Nexus should occur
