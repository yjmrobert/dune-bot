Feature: CHOAM Charity Phase
    As a poor Dune player
    I want to receive CHOAM Charity
    So that I can afford to play the game

  Background:
     Given a game is in the "CHOAM Charity" phase

  Scenario: Player with 0 spice receives 2 spice
     Given faction "Atreides" has 0 spice
     When the CHOAM Charity phase is processed
     Then faction "Atreides" should have 2 spice
     And the action log should contain "Atreides received 2 spice"

  Scenario: Player with 1 spice receives 1 spice
     Given faction "Harkonnen" has 1 spice
     When the CHOAM Charity phase is processed
     Then faction "Harkonnen" should have 2 spice
     And the action log should contain "Harkonnen received 1 spice"

  Scenario: Player with 2 spice receives nothing
     Given faction "Fremen" has 2 spice
     When the CHOAM Charity phase is processed
     Then faction "Fremen" should have 2 spice
     And the action log should not contain "Fremen received"

  Scenario: Player with more than 2 spice receives nothing
     Given faction "Emperor" has 10 spice
     When the CHOAM Charity phase is processed
     Then faction "Emperor" should have 10 spice
     And the action log should not contain "Emperor received"
