Feature: Bidding Phase
    As a Dune player
    I want to bid on Treachery Cards
    So that I can gain advantages and weapons

  Background:
    Given a game with 4 factions: Atreides, Harkonnen, Emperor, Fremen
    And the game is in the "Bidding" phase

  Scenario: Players with full hands are excluded from dealing count
    Given "Atreides" has 4 Treachery Cards
    And "Harkonnen" has 1 Treachery Card
    And "Emperor" has 0 Treachery Cards
    And "Fremen" has 3 Treachery Cards
    When the Bidding Phase starts
    Then 3 cards should be dealt for auction

  Scenario: Players with full hands cannot bid
    Given "Atreides" has 4 Treachery Cards
    And "Harkonnen" has 0 Treachery Cards
    When the Bidding Phase starts
    Then "Atreides" should not be eligible to bid
    And "Harkonnen" should be eligible to bid

  Scenario: First player starts bidding
    Given "Atreides" is the First Player
    And all players have 0 Treachery Cards
    When the Bidding Phase starts
    Then it should be "Atreides" turn to bid

  Scenario: Bidding must exceed current bid
    Given "Atreides" is the First Player
    And the current bid is 2
    When "Atreides" places a bid of 1
    Then the bid should be rejected

  Scenario: Bidding cannot exceed spice holdings
    Given "Atreides" is the First Player
    And "Atreides" has 5 spice
    When "Atreides" places a bid of 6
    Then the bid should be rejected

  Scenario: Basic Auction Flow
    Given "Atreides" is the First Player
    And "Harkonnen" is second
    And "Emperor" is third
    And "Atreides" has 10 spice
    And "Harkonnen" has 10 spice
    When the Bidding Phase starts
    And "Atreides" places a bid of 1
    Then the current bid should be 1
    And high bidder should be "Atreides"
    And it should be "Harkonnen" turn to bid

  Scenario: Passing rotates strictly to next player
    Given "Atreides" is first
    And "Harkonnen" is second
    And "Emperor" is third
    When the Bidding Phase starts
    And "Atreides" passes
    Then it should be "Harkonnen" turn to bid

  Scenario: Winning a bid
    Given "Atreides" is first
    And "Harkonnen" is second
    And "Emperor" is third
    And "Atreides" has 10 spice
    And "Emperor" has 10 spice
    When the Bidding Phase starts
    And "Atreides" places a bid of 2
    And "Harkonnen" passes
    And "Emperor" passes
    And "Atreides" passes
    Then "Atreides" should win the auction
    And "Atreides" should have 8 spice
    And "Emperor" should have 12 spice
    And "Atreides" should have 1 Treachery Cards

  Scenario: Next card starts with player to the right of previous starter
    Given "Atreides" is first
    And "Harkonnen" is second
    And "Emperor" is third
    And "Fremen" is fourth
    And there are 2 cards up for auction
    When the Bidding Phase starts
    And "Atreides" places a bid of 1
    And "Harkonnen" passes
    And "Emperor" passes
    And "Fremen" passes
    And "Atreides" passes
    Then card 1 should be sold
    And it should be "Harkonnen" turn to bid
