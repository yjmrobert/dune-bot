# Game Flow & Logic Guide

This document maps the Dune board game phases to specific Discord interactions using the defined [UX Patterns](./UX_PATTERNS.md).

## Phase 1: Setup
*Objective*: Assign factions, spawn forces, deal starting traitors.

1.  **Join Lobby**: Players click `[Join Game]` (Standard Button).
2.  **Start Game**: Host clicks `[Start Game]`.
3.  **Traitor Selection (Barrier Pattern)**:
    *   **State**: `phase: "Setup_TraitorPick"`.
    *   **Action**: Bot deals 4 traitors to each player (internally).
    *   **Display**: "Waiting for players to select traitors..."
    *   **Player View**: Click `[Select Traitor]`.
        *   -> Ephemeral Select Menu: "Choose 1 Traitor to KEEP".
    *   **Logic**: Once a player selects, they are marked "Ready".
    *   **Transition**: When all 6 ready -> Advance to Storm Phase.

## Phase 2: Storm
*Objective*: Move the storm, kill forces, create spice.

1.  **Calculation**: Bot automatically calculates storm movement (unless using advanced rules where players play cards).
2.  **Display**: "Storm moved to Sector X. Forces lost: Y."
3.  **Transition**: Auto-advance to Spice Blow.

## Phase 3: Spice Blow
*Objective*: Reveal spice cards, add spice to territories.

1.  **Action**: Host/Any Player clicks `[Reveal Spice Blow]`.
2.  **Display**: Show card image. Add spice value to board.
3.  **Nexus Check**:
    *   If Card == "Shai-Hulud", trigger Nexus.
    *   **Nexus Phase (Barrier)**: Players have 60s to play Alliance cards or vote? (Simplified: Just Auto-resolve or manual button if complex).
4.  **Transition**: `[Next Phase]` button.

## Phase 4: CHOAM Charity
*Objective*: Poor players claim money.

1.  **Auto-Resolve**: Bot identifies players with < 2 spice.
2.  **Action**: Bot grants spice automatically.
3.  **Log**: "CHOAM Charity: Atreides received 2 spice."
4.  **Transition**: Auto-advance to Bidding.

## Phase 5: Bidding
*Objective*: Auction Treachery Cards.

1.  **Loop**: For each card in the auction queue:
    *   **Display**: "Bidding on Card #1. Current Bid: 0 by None."
    *   **Turn Order**: Only the active player's buttons are enabled (Green). Others are disabled (Grey).
    *   **Buttons (Auction Pattern)**:
        *   `[Bid +1]`
        *   `[Bid +5]`
        *   `[Pass]`
    *   **Logic**:
        *   If `Pass`: Move priority to next player.
        *   If `Bid`: Update current bid, move priority.
        *   If *Everyone Passes*:
            *   If bid > 0: Winner pays, gets card.
            *   If bid == 0: Card shuffled back/discarded.
2.  **Transition**: When all cards auctioned -> Advance to Revival.

## Phase 6: Revival
*Objective*: Revive forces/leaders from tanks.

1.  **State**: `phase: "Revival"`.
2.  **Barrier Pattern**: Waiting for all players.
3.  **Player Action**: `[Open Revival Menu]` (Wizard).
    *   **Step 1**: "Select Items to Revive" (Multi-Select Menu: "Leader: Stilgar (X Spice)", "Forces: 3 (Y Spice)").
    *   **Step 2**: Total Cost calculated. Confirm.
4.  **Logic**: Validates spice cost and limits (3 forces/1 leader).
5.  **Transition**: When all players click `[Done Reviving]`.

## Phase 7: Shipment & Movement
*Objective*: Move forces on the board.

1.  **Turn-Based**: Standard player order.
2.  **Player Action**: `[Ship / Move]` (Wizard).
    *   **Step 1**: Select "Shipment" or "Movement".
    *   **Step 2 (Shipment)**:
        *   Select Territory (Filter: All territories).
        *   Select Sector (Modal/Select).
        *   Select Force Count (Modal/Dial).
    *   **Step 3 (Movement)**:
        *   Select Start Territory (Filter: Where you have forces).
        *   Select End Territory (Filter: Adjacency/Ornithopter rules).
        *   Select Force Count.
3.  **Transition**: Player clicks `[End Turn]` -> Next player. Last player -> Battle Phase.

## Phase 8: Battle
*Objective*: Resolve conflicts.

1.  **Detection**: Bot identifies all contested territories.
2.  **Loop**: Iterate through battles based on rules (Storm order).
3.  **Battle Planning (Double Blind Wizard)**:
    *   **Display**: "Battle in Arrakeen: Atreides vs Harkonnen".
    *   **State**: Waiting for P1_Plan and P2_Plan.
    *   **Action**: Players click `[Submit Battle Plan]` (Ephemeral stats).
        *   **Step 1**: Select Leader (Dropdown).
        *   **Step 2**: Enter Dial Number (Modal: Must be <= forces).
        *   **Step 3**: Select Weapon (Dropdown: Filter Hand, Optional).
        *   **Step 4**: Select Defense (Dropdown: Filter Hand, Optional).
4.  **Resolution**:
    *   Once both plans submitted -> Reveal.
    *   **Logic**:
        *   Traitor Check (Auto).
        *   Weapon/Defense Interaction (Poison/Snooper).
        *   Calculate Total.
        *   Determine Winner.
        *   Kill Leaders/Forces.
5.  **Transition**: Next battle OR Spice Collection.

## Phase 9: Spice Collection
*Objective*: Collect spice from occupied territories.

1.  **Auto-Resolve**: Bot calculates rates (2 or 3 per force).
2.  **Display**: "Spice Harvest Report: ..."
3.  **Transition**: Mentat Pause.

## Phase 10: Mentat Pause
*Objective*: Check win conditions, claim victory.

1.  **Win Check**: Bot checks fortress counts.
2.  **Barrier Pattern**: "Turn Complete. Check for win conditions."
3.  **Action**: `[Continue]` by all players starts next turn.
