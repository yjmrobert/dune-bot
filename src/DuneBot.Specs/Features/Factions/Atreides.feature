Feature: Atreides Faction
  In order to plan my strategy
  As the Atreides Faction
  I want to see the future

  Scenario: Atreides sees the next card up for bid
    Given the game is in the "ChoamCharity" phase
    And the "Atreides" faction is in the game
    And the next card in the deck is "Lasgun"
    When the phase advances to "Bidding"
    Then "Atreides" should receive a DM containing "Lasgun"
