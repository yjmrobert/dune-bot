import { describe, it, expect, vi, beforeEach } from "vitest";
import { PrescienceCommand } from "../commands/interactions/PrescienceCommand";
import { Faction, GameState } from "../types";

describe("PrescienceCommand", () => {
    let command: PrescienceCommand;
    let mockGameManager: any;
    let mockInteraction: any;

    beforeEach(() => {
        command = new PrescienceCommand();
        mockGameManager = {
            getGame: vi.fn(),
        };
        mockInteraction = {
            user: { id: "user123" },
            member: { id: "user123" }, // Needed if checked
            reply: vi.fn(),
        };
    });

    it("should reply ephemeral error if not Atreides", async () => {
        mockGameManager.getGame.mockResolvedValue({
            stateJson: JSON.stringify({
                factions: [{ playerDiscordId: "user123", faction: Faction.Harkonnen }]
            })
        });

        await command.execute({ interaction: mockInteraction, gameManager: mockGameManager, gameId: 1 } as any);

        expect(mockInteraction.reply).toHaveBeenCalledWith(expect.objectContaining({
            content: "Only Atreides can use Prescience.",
            flags: expect.anything() // MessageFlags.Ephemeral
        }));
    });

    it("should show current bid card during Bidding phase check", async () => {
        const state: GameState = {
            phase: "Bidding",
            isBiddingRoundActive: true,
            currentCard: { name: "Lasgun", type: "Weapon", description: "Boom" },
            factions: [{ playerDiscordId: "user123", faction: Faction.Atreides }],
            spiceDeck: [],
            // Mock other fields
        } as any;

        mockGameManager.getGame.mockResolvedValue({
            stateJson: JSON.stringify(state)
        });

        await command.execute({ interaction: mockInteraction, gameManager: mockGameManager, gameId: 1 } as any);

        expect(mockInteraction.reply).toHaveBeenCalledWith(expect.objectContaining({
            content: expect.stringContaining("Prescience (Bidding)"),
        }));
        expect(mockInteraction.reply).toHaveBeenCalledWith(expect.objectContaining({
            content: expect.stringContaining("Lasgun"),
        }));
    });

    it("should show next spice card if not Bidding check", async () => {
        const state: GameState = {
            phase: "Storm",
            factions: [{ playerDiscordId: "user123", faction: Faction.Atreides }],
            spiceDeck: [{ name: "Heighliner", type: "Spice", amount: 10, sector: 1 }],
            // Mock other fields
        } as any;

        mockGameManager.getGame.mockResolvedValue({
            stateJson: JSON.stringify(state)
        });

        await command.execute({ interaction: mockInteraction, gameManager: mockGameManager, gameId: 1 } as any);

        expect(mockInteraction.reply).toHaveBeenCalledWith(expect.objectContaining({
            content: expect.stringContaining("Prescience (Spice Deck)"),
        }));
        expect(mockInteraction.reply).toHaveBeenCalledWith(expect.objectContaining({
            content: expect.stringContaining("Heighliner"),
        }));
    });
});
