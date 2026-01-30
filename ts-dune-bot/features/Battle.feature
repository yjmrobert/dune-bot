Feature: Battle Phase
  As a player
  I want to resolve battles in contested territories
  So that I can eliminate opponent forces and claim territory

  Background:
    Given the game is in the "Battle" phase
    And faction "Atreides" exists with 10 spice and 10 reserves
    And faction "Harkonnen" exists with 10 spice and 10 reserves
    And "Arrakeen" is a Stronghold

  Scenario: Basic Battle Resolution (High Strength Wins)
    Given "Atreides" has 5 forces in "Arrakeen"
    And "Harkonnen" has 5 forces in "Arrakeen"
    And "Atreides" has leader "Gurney Halleck" (Strength 4)
    And "Harkonnen" has leader "Beast Rabban" (Strength 2)
    When a battle is initiated in "Arrakeen"
    And "Atreides" submits battle plan: Leader "Gurney Halleck", Dial 5
    And "Harkonnen" submits battle plan: Leader "Beast Rabban", Dial 5
    Then "Atreides" should be the winner
    And "Harkonnen" should have 0 forces in "Arrakeen"
    And "Atreides" should have 0 forces in "Arrakeen"
    # Winner lost 5 forces (Dial 5)

  Scenario: Battle with Traitor (Traitor Loses)
    Given "Atreides" has 5 forces in "Arrakeen"
    And "Harkonnen" has 5 forces in "Arrakeen"
    And "Atreides" has leader "Dr. Yueh" (Strength 1)
    And "Harkonnen" has leader "Beast Rabban" (Strength 2)
    # Dr. Yueh is traitor for Harkonnen
    And "Harkonnen" holds traitor card "Dr. Yueh"
    When a battle is initiated in "Arrakeen"
    And "Atreides" submits battle plan: Leader "Dr. Yueh", Dial 5
    And "Harkonnen" submits battle plan: Leader "Beast Rabban", Dial 1
    And "Harkonnen" calls traitor "Dr. Yueh"
    Then "Harkonnen" should be the winner
    And "Atreides" should have 0 forces in "Arrakeen"
    And "Harkonnen" should have 5 forces in "Arrakeen"
    # Winner lost 0 forces (Traitor victory is clean? Check rules. Usually no casualties for winner if traitor called.)

  Scenario: Battle Tie (Defender Wins)
    Given "Atreides" has 5 forces in "Arrakeen"
    And "Harkonnen" has 5 forces in "Arrakeen"
    And "Atreides" is the aggressor
    And "Atreides" has leader "Duncan Idaho" (Strength 2)
    And "Harkonnen" has leader "Beast Rabban" (Strength 2)
    When a battle is initiated in "Arrakeen"
    And "Atreides" submits battle plan: Leader "Duncan Idaho", Dial 5
    And "Harkonnen" submits battle plan: Leader "Beast Rabban", Dial 5
    # Total Atreides: 5 + 2 = 7. Harkonnen: 5 + 2 = 7.
    Then "Harkonnen" should be the winner
    And "Atreides" should have 0 forces in "Arrakeen"

  Scenario: Battle with Weapons and Defenses
    Given "Atreides" has 5 forces in "Arrakeen"
    And "Harkonnen" has 5 forces in "Arrakeen"
    And "Atreides" has leader "Gurney Halleck" (Strength 4)
    And "Harkonnen" has leader "Beast Rabban" (Strength 2)
    And "Atreides" has treachery card "Lasgun"
    And "Harkonnen" has treachery card "Shield"
    When a battle is initiated in "Arrakeen"
    And "Atreides" submits battle plan: Leader "Gurney Halleck", Weapon "Lasgun", Dial 5
    And "Harkonnen" submits battle plan: Leader "Beast Rabban", Defense "Shield", Dial 5
    # Interaction: Lasgun vs Shield -> Explosion? Or Shield blocks Lasgun?
    # Rules: Lasgun + Shield = ATOMIC EXPLOSION. Everyone dies.
    Then all forces in "Arrakeen" should be destroyed
