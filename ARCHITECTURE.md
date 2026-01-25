# Dune Bot Architecture

This document provides a high-level overview of the Dune Bot architecture to help developers understand the system structure and where to make changes.

## Overview

The solution follows a **Clean Architecture** approach, separating the domain core from infrastructure and implementation details.

### Solution Structure

| Project | Layer | Description |
|---------|-------|-------------|
| **DuneBot.Domain** | Core | Contains the core entities (`Game`, `TreacheryCard`), value objects, and **interfaces** (`IBattleService`, `IGameRepository`). Depending on nothing else. |
| **DuneBot.Engine** | Application | Implements the core game logic. Contains `GameEngine`, `PhaseManager`, and specific phase handlers (`BattlePhaseHandler`, etc.). Depends on `Domain`. |
| **DuneBot.Data** | Infrastructure | Handles data persistence using EF Core and SQLite. Implements repositories defined in `Domain`. Depends on `Domain`. |
| **DuneBot.Renderer** | Infrastructure | Handles visualization of the game state (text or images). Implements `IGameRenderer`. Depends on `Domain`. |
| **DuneBot.Host** | Presentation/Host | The entry point. Handles Discord interactions, dependency injection wiring, and hosting via a Worker service. Depends on all other projects. |
| **DuneBot.Specs** | Testing | BDD tests using Reqnroll to verify game logic against the rules. |

## Data Flow

1.  **User Interaction**: A user interacts with the bot via Discord commands (handled in `DuneBot.Host`).
2.  **Command Handling**: The `Host` routes the command to the `GameEngine` or specific services.
3.  **Game Logic**: The `Engine` processes the request, updating the `GameState` (defined in `Domain`).
    *   State changes are often managed by specific `PhaseHandlers`.
4.  **Persistence**: The state is saved/loaded using repositories in `DuneBot.Data`.
5.  **Output**: The `Engine` requests a render of the new state via `IGameRenderer` (implemented in `Renderer`), which `Host` sends back to Discord.

## Key Patterns

*   **Dependency Injection**: All services are registered in `DuneBot.Host/Program.cs`.
*   **Repository Pattern**: Access to `Game` and `TreacheryCard` data is abstracted behind `IGameRepository`.
*   **State Pattern**: The game flow is divided into phases (Storm, Spice Blow, Battle, etc.), each managed by a handler implementing `IGamePhaseHandler`.
*   **Serialized State**: The complex game state is serialized to JSON (`Game.StateJson`) for storage in SQLite, allowing for rich object models that don't map 1:1 to relational tables.

## Where to Make Changes

| Task | Where to Go |
|------|-------------|
| **Add a new Game Phase** | 1. Define interface behavior in `Domain` (if needed).<br>2. Create handler in `Engine/Phases`.<br>3. Register in `Host/Program.cs`. |
| **Modify Game Rules** | Check `DuneBot.Engine`. Most logic is in `Services` or `Phases`. |
| **Add/Edit Cards** | Modify `TreacheryCardSeedData.cs` in `DuneBot.Data` to update the initial seed data. |
| **Change Storage** | Modify `DuneDbContext` or `Repositories` in `DuneBot.Data`. |
| **Update Visuals** | Modify `GraphicalGameRenderer.cs` in `DuneBot.Renderer`. |
| **Add Discord Command** | Add/Modify Interaction Modules in `DuneBot.Host`. |

## Database

The project uses **SQLite**.
*   Connection String: `Data Source=dune.db`
*   Context: `DuneDbContext`

## Testing

*   **Unit Tests**: `DuneBot.Tests` for individual components.
*   **BDD Tests**: `DuneBot.Specs` for end-to-end game rule verification using Gherkin syntax.
