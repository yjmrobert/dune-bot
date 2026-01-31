# Dune Bot UX Patterns

To ensure a consistent and high-quality player experience (PX), we utilize a set of standardized interaction patterns across the bot. This abstraction allows us to reuse logic and maintain a uniform "feel" for the game.

## 1. The Ephemeral Wizard Pattern
Used for complex inputs requiring multiple checks (e.g., Shipment, Battle Plans).

**Problem**: Discord modals don't support autocomplete or dynamic filtering.
**Solution**: A multi-step ephemeral message flow that guides the user.

**Flow**:
1.  **Trigger**: User clicks a persistent button (e.g., `[Ship Forces]`) on the main Game View.
2.  **Step 1 (Ephemeral)**: Bot replies with a dropdown (Select Menu) of valid *primary* options (e.g., "Select Start Territory").
    *   *Constraint*: Filter the list to only show valid choices (e.g., territories with your forces).
3.  **Step 2 (Ephemeral)**: Upon selection, bot edits the ephemeral message to show the next input (e.g., "Select Target Sector").
4.  **Completion**: Final step (usually a Button `[Confirm]` or a Modal for numbers) submits the action.
5.  **Feedback**: The ephemeral message updates to "Action Submitted", and the Main Game View updates publicly.

**Usage**: Shipment, Movement, Battle Plans, Karama Cards.

## 2. The Barrier Pattern (Phase Gating)
Used when the game cannot proceed until *all* players (or a specific subset) have acknowledged/completed a task.

**Problem**: One fast player shouldn't skip a phase that requires others' attention (e.g., Mentat Pause, Traitor Selection).
**Solution**: A "Ready" tracking system.

**Flow**:
1.  **State**: The Game State tracks a set of `pendingPlayerIds`.
2.  **Display**: The Status Embed displays: "Waiting for: Atreides, Harkonnen".
3.  **Interaction**: Players click a `[Ready]` button.
4.  **Logic**:
    *   If `userId` is in `pendingPlayerIds`, remove them.
    *   Check `if (pendingPlayerIds.length === 0)`.
    *   If true, trigger `advancePhase()`.

**Usage**: Mentat Pause, initial Setup (Traitor Picking), End of Turn.

## 3. The Contextual Action Pattern
Used to reduce cognitive load by only showing valid legal moves.

**Problem**: Showing a "Call Traitor" button when you don't have the traitor card is confusing and clutters the UI.
**Solution**: Dynamic button generation based on state analysis.

**Flow**:
1.  **Analysis**: Before rendering the view, run `getAvailableActions(state)`.
2.  **Filtering**: Check specific conditions (e.g., `hasTraitorMatching(opponentLeader)`).
3.  **Render**: If condition is true, inject the detailed button (e.g., `[Call Traitor: Stilgar]`).
4.  **Security**: The backend handler *must* re-validate the condition upon click (in case of race conditions).

**Usage**: Traitor Calls, Spice Blow (Nexus opportunities), Bene Gesserit Prediction reveal.

## 4. The Private Information Pattern
Used to manage "Hidden Information" games on a public public platform.

**Problem**: Information like Hand Cards and Traitors must remain private.
**Solution**:
1.  **On-Demand**: A permanent `[My Info]` button enables players to check their status anytime via ephemeral message.
2.  **Contextual**: During relevant phases (e.g., Battle), the Wizard explicitly shows the private options (e.g., "Select Weapon" dropdown only shows weapons in *your* hand).

## 5. The Auction Pattern
Used for Bidding.

**Flow**:
1.  **Turn-Based**: Only the current bidder sees enabled buttons; others see disabled buttons.
2.  **Simple Inputs**: Instead of typing numbers, provide shorthand:
    *   `[Bid +1]`
    *   `[Bid +5]`
    *   `[Or Exact Bid...]` (Optional Modal for edge cases)
    *   `[Pass]`
