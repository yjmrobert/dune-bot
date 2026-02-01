# System Architecture

## Overview
This document outlines the core architectural patterns and components of the Dune Discord Bot.

## Core Components

### 1. Game State Management
- **GameState**: A JSON-serializable object stored in the database (`Game` model). It holds the entire state of the game.
- **GameEngine**: Pure business logic class. Accepts `GameState` and action parameters, verifies rules, mutates state, and returns the simplified state.
- **GameManager**: Application layer service. Handles database I/O, Discord interactions, and orchestrates calls to `GameEngine`.
- **Memento Pattern**: `GameState.wizardState` stores temporary, uncommitted state for multi-step UI interactions (Wizards).

### 2. Service Layer
- **WizardService**: Facade for handling multi-step user interactions.
    - **Strategy Pattern**: Uses `IWizardStrategy` implementations (e.g., `ShipmentWizardStrategy`, `BattleWizardStrategy`) to handle specific wizard logic.
- **BoardService**: Static utility service for board-related queries (forces, sector lookups, storm checks).
- **DiscordService**: Abstraction for Discord API interactions (channels, messages, embeds).

### 3. UI / Presentation
- **GamePresenter**: Pure function that maps `GameState` to a `GameView` (Embeds + Buttons).
- **Phase Handlers (Planned)**: Strategy pattern for generating phase-specific available actions and UI elements.

## Key Patterns

### Wizard Pattern (Ephemeral UI)
Complex actions (Shipment, Revival, Battle) use a "Wizard" flow:
1.  **Interaction**: User clicks a button.
2.  **State Update**: Temporary state is stored in `GameState.wizardState`.
3.  **UI Update**: Ephemeral message updates with new options (Select Menu, Buttons).
4.  **Confirm**: User commits the action. `WizardCommand` invokes `GameManager` to execute the business logic and clear temporary state.

### Command Dispatch
- **Slash Commands**: Entry points for global actions.
- **Interaction Commands**: Handled by `InteractionDispatcher`. Route button clicks/selects to specific commands (e.g., `WizardCommand`, `PhaseCommand`).

## Data Flow
`User Interaction` -> `InteractionDispatcher` -> `Command (Wizard/Phase)` -> `WizardService` -> `GameManager` -> `GameEngine` -> `DB`
                                                                     -> `BoardService`
