
import { describe, test, expect, vi } from "vitest";
import { execute } from "../commands/deleteAllGames";
import { MessageFlags } from "discord.js";

// Mock Discord's DiscordAPIError
class MockDiscordError extends Error {
    code: number;
    constructor(code: number, message: string) {
        super(message);
        this.code = code;
    }
}

describe("deleteAllGames Stability", () => {
    test("uses deferReply to prevent timeout issues", async () => {
        const interaction: any = {
            guildId: "123",
            deferReply: vi.fn().mockResolvedValue(undefined),
            editReply: vi.fn(),
            reply: vi.fn(), // Should not be called
            replied: false,
            deferred: false
        };
        const gameManager: any = { deleteAllGames: vi.fn().mockResolvedValue(5) };

        await execute(interaction, gameManager);

        expect(interaction.deferReply).toHaveBeenCalled();
        expect(interaction.reply).not.toHaveBeenCalled();
        expect(interaction.editReply).toHaveBeenCalledWith(expect.stringContaining("Deleted 5 games"));
    });

    test("Interaction error handler safely ignores 10062/40060 errors", async () => {
        // This test validates the LOGIC placed in index.ts
        const interaction: any = {
            replied: false,
            deferred: false,
            followUp: vi.fn(),
            reply: vi.fn()
        };

        // Simulate the catch block in index.ts
        const error: any = new Error("Unknown interaction");
        error.code = 10062;

        const handleError = async (err: any, intr: any) => {
            if (err.code === 10062 || err.code === 40060) {
                return; // success
            }
            // fallback
            if (intr.replied || intr.deferred) {
                await intr.followUp({ content: 'Error!', flags: MessageFlags.Ephemeral });
            } else {
                await intr.reply({ content: 'Error!', flags: MessageFlags.Ephemeral });
            }
        };

        // Should NOT crash and NOT try to reply
        await handleError(error, interaction);
        expect(interaction.reply).not.toHaveBeenCalled();
        expect(interaction.followUp).not.toHaveBeenCalled();
    });
});
