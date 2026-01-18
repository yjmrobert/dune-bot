Feature: Bene Gesserit Faction
  In order to control the flow of battle
  As the Bene Gesserit Faction
  I want to use the Voice to restrict opponent cards

  Background:
     Given the game is in the "Battle" phase

  Scenario: Voice forbids a weapon
    Given the following factions are in a battle in "Arrakeen":
      | Faction      | Leader | Dial | Weapon | Defense |
      | BeneGesserit | Dame   | 1    | None   | None    |
      | Atreides     | Duncan | 5    | Lasgun | None    |
    And "BeneGesserit" uses Voice on "Atreides" to forbid "Lasgun"
    When the battle is resolved
    Then the action should fail with message "Voice forbids"

  Scenario: Voice forces a card
    Given the following factions are in a battle in "Arrakeen":
      | Faction      | Leader | Dial | Weapon | Defense |
      | BeneGesserit | Dame   | 1    | None   | None    |
      | Atreides     | Duncan | 5    | Lasgun | None    |
    And "Atreides" holds "Shield"
    And "BeneGesserit" uses Voice on "Atreides" to force "Shield"
    When the battle is resolved
    Then the action should fail with message "Voice requires"
