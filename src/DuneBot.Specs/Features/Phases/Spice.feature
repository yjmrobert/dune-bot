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
    # Great Flat is a "Rich" territory (10 or 12?). Standard is 6, Rich 8/10/12?
    # Engine logic viewed in step 362: "The Great Flat" gets 10.

  Scenario: Spice Blow B adds spice
    Given the next spice card B is "Broken Land"
    When the spice blow is resolved
    Then territory "Broken Land" should have 10 spice
