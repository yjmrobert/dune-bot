# UI Master Spec

## Design System
All UI responses must adhere to these constraints.

**Embed Colors:**
- `NEUTRAL`: Info / Menu
- `SUCCESS`: Positive action
- `DANGER`: Negative action

## Phase Buttons

### Lobby
- TITLE: "Lobby | Round 0"
- DESCRIPTIONS: 
    - "Join the game or start it."
    - "Waiting for players to join..."
- `[Join Game]`
- `[Start Game]`

### Game Setup
- TITLE: "Setup | Round 0"
- DESCRIPTIONS: 
    - "Select your traitor and place your forces."
    - "Waiting for players to select traitors..."
    - "Waiting for players to place forces..."
- `[Select Traitor]` (Ephemeral Wizard)
    - `[Keep {traitorName}]`
    - `[Discard {traitorName}]`
    - `[Reset]`
    - `[Confirm]`
        - NOTE: Once all players have selected their traitors, the description will be updated to remove the line "Waiting for players to select traitors...".
- `[Place Forces]` (Ephemeral Wizard)
    - NOTE: This is a multi-step ephemeral wizard until all forces are placed in possible territories.
    - `[Place {territoryName} - 1 Force]`
    - `[Place {territoryName} - 2 Forces]`
    - `[Remove {territoryName} - 1 Force]`
    - `[Remove {territoryName} - 2 Forces]`
    - `[Reset]`
    - `[Confirm]`
        - NOTE: Once all players have placed their forces, the description will be updated to remove the line "Waiting for players to place forces...".
- `[My Info]` (Ephemeral Wizard)
    - `[View Hand]`
    - `[View Traitors]`
    - `[View Forces]`
    - `[View Leader]`
    - `[View Resources]`
- `[Ready]` (Barrier Pattern)
- `[Next Phase]`
    - NOTE: This will be disabled until all players have clicked `[Ready]`.

### Storm
- `[Move Storm]`
    - NOTE: This will be disabled once it has been moved.
- `[Next Phase]`
    - NOTE: This will be disabled until the storm has been moved.

### Spice Blow
- TITLE: "Spice Blow | Round {roundNumber}"
- DESCRIPTION: "Reveal the spice blow."
- `[Reveal Spice Blow]`
    - NOTE: If the card is Shai-Hulud, the description will be updated to show "Nexus Triggered!". The Nexus Phase will be queued and another card will be revealed.
    - NOTE: If the card is not Shai-Hulud, the description will be updated to show "Spice Blow Reveal: {territoryName} - {spiceValue}".
- `[Next Phase]`


### Nexus
- TITLE: "Nexus | Round {roundNumber}"
- DESCRIPTION: 
    - "Resolve the Nexus."
    - "Waiting for players to resolve the Nexus..."
- `[Form Alliance with {playerName}]`
    - NOTE: This will be disabled if the player is already allied with another player.
    - NOTE: There will be a button for each other player.
- `[Break Alliance with {playerName}]`
- `[Ready]` (Barrier Pattern)
- `[Next Phase]`
    - NOTE: This will be disabled until all players have clicked `[Ready]`.

### CHOAM Charity
- TITLE: "CHOAM Charity | Round {roundNumber}"
- DESCRIPTION: 
    - "Claim your share of the spice."
- `[CHOAM]`
    - NOTE: This is only enabled if you have less than 2 spice.
    - NOTE: This will grant 2 spice to the player.
    - NOTE: This will also update the description to show "CHOAM Charity: {playerName} received 2 spice."
- `[Ready]` (Barrier Pattern)
- `[Next Phase]`
    - NOTE: This will be disabled until all players have clicked `[Ready]`.

### Bidding
- TITLE: "Bidding | Round {roundNumber}"
- DESCRIPTION: 
    - "Bid on the treachery cards."
    - "There are {number} cards left to bid on."
- NOTE: This will create a thread for each card to bid on.
- NOTE: The thread will be named "Card {number}"
- NOTE: There will only be one active thread at a time. The other threads will be hidden until the active thread is closed.
- NOTE: Inside each thread will be the following buttons:
    - `[Bid +1]`
    - `[Bid +2]`
    - `[Pass]`
    - NOTE: Clicking a button will move the priority to the next player.
    - NOTE: If the player has already passed, the buttons will not work for them.
    - NOTE: The current bid will be shown in the thread after the player clicks a button.
    - NOTE: After the last player bids, the thread will be closed and the next card will be revealed.
- `[Ready]` (Barrier Pattern)
- `[Next Phase]`
    - NOTE: This will be disabled until all players have clicked `[Ready]`.

### Revival
- TITLE: "Revival | Round {roundNumber}"
- DESCRIPTION: 
    - "Revive your forces."
    - "{FactionName} has {X} Troops in Tanks and {Y} Free Revives."
- `[Open Revival Menu]` (Ephemeral Wizard)
    - TITLE: "Revival Planning for {FactionName}"
    - DESCRIPTION: 
        - "Select your troops and leaders to revive."
        - "You have {X} Troops in Tanks and {Y} Free Revives."
        - "You are currently planning to revive {X} Troops for {Y} Spice."
    - `[Select Troops to Revive]`
        - NOTE: This will be a multi-select menu.
        - NOTE: The player will be able to select up to 3 troops.
        - NOTE: If the number is greater than the number of troops the player has in tanks, the button will be hidden.
        - `[Revive +1 Troop]`
        - `[Revive -1 Troop]`
        - FOREACH: Leader in the tanks
            - `[Revive {LeaderName}]`
            - NOTE: This will add the leader to the revival plan.
            - NOTE: A player can only revive one leader, all other leader buttons will be disabled once a leader is selected.
    - `[Confirm]` (Barrier Pattern)
        - NOTE: If the player revived troops, the phase description will be updated to show "{FactionName} has revived {X} Troops and paid {Y} Spice."
        - NOTE: If the player revived a leader, the phase description will be updated to show "{FactionName} has revived {X} Leaders and paid {Y} Spice."
    - `[Reset]`
        - NOTE: This will reset the revival plan.
- `[Ready]` (Barrier Pattern)
- `[Next Phase]`
    - NOTE: This will be disabled until all players have clicked `[Ready]`.

### Shipment & Movement
- TITLE: "Shipment & Movement | Round {roundNumber}"
- DESCRIPTION: 
    - "Ship your forces and move your troops."
- `[Shipment]` (Wizard)
    - TITLE: "Shipment for {FactionName}"
    - DESCRIPTION: 
        - "Select your forces to ship."
        - "You have {X} Troops in reserve."
    - `[Select Troops to Ship]`
        - `[Ship +1 Troop]`
        - `[Ship -1 Troop]`
        - `[Reset]`
    - `[Confirm]`
        - NOTE: This will confirm the shipment plan.
    - `[Reset]`
        - NOTE: This will reset the shipment plan.
- `[Movement]` (Wizard)
    - TITLE: "Movement for {FactionName}"
    - DESCRIPTION: 
        - "Select your forces to move."
    - FOREACH: Territory with that player's forces
        - `[Move from {territoryName}]`
            - NOTE: This will move the forces from the territory to another territory.
            - FOREACH: Territory that is eligible to receive forces. This will be any territory that is adjacent to the territory with that player's forces. If the player has control of an ornithoptor, they can move to any territory that is within 2 territories of the territory with that player's forces.
                - `[Move to {territoryName}]`
                    - NOTE: This will move the forces to the territory.
                    - NOTE: If the territory is already occupied by an ally or by more than two players, the button will be disabled.
                    - `[Move +1 Troop]`
                    - `[Move -1 Troop]`
                    - `[Confirm]`
                        - NOTE: This will confirm the movement plan.
                    - `[Reset]`
                        - NOTE: This will reset the movement plan.
- `[Ready]` (Barrier Pattern)
- `[Next Phase]`
    - NOTE: This will be disabled until all players have clicked `[Ready]`.

### Battle
- TITLE: "Battle | Round {roundNumber}"
- DESCRIPTION: 
    - "Battle for control of the territories."
- FOREACH: Territory with a battle happening. Starting with the first player choosing all their battles, then the second player choosing all their battles, and so on.
    - `[Battle for {territoryName}]` (Wizard)
        - TITLE: "Battle for {territoryName}"
        - DESCRIPTION: 
            - "Battle for control of {territoryName}."
        - `[Commit +1 Troop]`
            - NOTE: A player cannot commit more troops than they have.
        - `[Commit -1 Troop]`
            - NOTE: A player cannot commit less than 0 troops.
        - `[Pick Leader]`
            - NOTE: This will allow the player to pick a leader to lead the battle.
            - FOREACH: Leader that is not in the tanks
                - `[Pick {leaderName}]`
                    - NOTE: This will pick the leader to lead the battle.
                - `[Cheap Hero]`
                    - NOTE: This will allow the player to pick a cheap hero to lead the battle.
                    - NOTE: This will be disabled if the player does not have a cheap hero card in their hand.
        - `[Pick Weapon]`
            - NOTE: This will allow the player to pick a weapon to use in the battle.
            - FOREACH: Weapon that is in the player's hand
                - `[Pick {weaponName}]`
                    - NOTE: This will pick the weapon to use in the battle.
        - `[Pick Defense]`
            - NOTE: This will allow the player to pick a defense to use in the battle.
            - FOREACH: Defense that is in the player's hand
                - `[Pick {defenseName}]`
                    - NOTE: This will pick the defense to use in the battle.
        - `[Submit Battle Plan]`
            - NOTE: This will submit the battle plan.
        - `[Reset]`
            - NOTE: This will reset the battle plan.
- `[Ready]` (Barrier Pattern)
- `[Next Phase]`
    - NOTE: This will be disabled until all players have clicked `[Ready]`.

### Spice Collection
- TITLE: "Spice Collection | Round {roundNumber}"
- DESCRIPTION: 
    - "Collect spice from occupied territories."
- `[Collect]`
    - NOTE: This will collect the spice from the occupied territories.
    - NOTE: This will be disabled if the player does not have any occupied territories with spice on them.
    - NOTE: This will add a description to the phase that shows the amount of spice collected by each player.
    - NOTE: This will also add that amount to the player's spice count.
- `[Ready]` (Barrier Pattern)
- `[Next Phase]`
    - NOTE: This will be disabled until all players have clicked `[Ready]`.

### Mentat Pause
- TITLE: "Mentat Pause | Round {roundNumber}"
- DESCRIPTION: 
    - "Take a moment to reflect on the events of the round."
- `[Ready]` (Barrier Pattern)
- `[Next Phase]`
    - NOTE: This will be disabled until all players have clicked `[Ready]`.

