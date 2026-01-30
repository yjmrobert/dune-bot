Feature: Game Setup
    As a Dune player
    I want to join games and start them
    So that I can play Dune

  Background:
    Given a new game is created with ID 1

  Scenario: Player joins a game successfully
    When player "Paul" joins game 1
    Then the game should have 1 player
    And the player "Paul" should be in the game

  Scenario: Player cannot join the same game twice
    Given player "Paul" has joined game 1
    When player "Paul" tries to join game 1
    Then the join request should be rejected

  Scenario: Max 6 players can join
    Given 6 players have joined game 1
    When player "Paul" tries to join game 1
    Then the join request should be rejected

  Scenario: Cannot join if game already started
    Given the game 1 has started
    When player "Paul" tries to join game 1
    Then the join request should be rejected

  Scenario: Starting a game initializes the board
    Given player "Paul" has joined game 1
    And player "Baron" has joined game 1
    When the game 1 is started
    Then the game phase should be "Storm"
    And the Storm should be at a valid sector
    And Treachery Deck should be shuffled
    And Spice Deck should be shuffled

  Scenario: Cannot start game with no players
    When the game 1 is started
    Then the start request should be rejected
