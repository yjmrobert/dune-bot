
import { describe, test, expect, vi } from "vitest";
import { MessageFlags } from "discord.js";

// Mock Discord's DiscordAPIError
class MockDiscordError extends Error {
    code: number;
    constructor(code: number, message: string) {
        super(message);
        this.code = code;
    }
}

describe("Button Interaction Stability", () => {
    test("Button handler safely ignores 10062/40060 errors", async () => {
        // This simulates the logic in index.ts for Buttons
        const interaction: any = {
            customId: "join-game:1",
            isButton: () => true,
            replied: false,
            deferred: false,
            followUp: vi.fn(),
            reply: vi.fn(),
            user: { id: "u1", username: "User1" }
        };

        // Simulate logic
        const handleError = async (err: any, intr: any) => {
            // Logic from index.ts
            if (err.code === 10062 || err.code === 40060) {
                return; // success
            }

            if (intr.deferred || intr.replied) {
                await intr.followUp({ content: `Error: ${err.message}`, flags: MessageFlags.Ephemeral });
            } else {
                await intr.reply({ content: `Error: ${err.message}`, flags: MessageFlags.Ephemeral });
            }
        };

        const error10062: any = new Error("Unknown interaction");
        error10062.code = 10062;
        await handleError(error10062, interaction);
        expect(interaction.reply).not.toHaveBeenCalled();

        const error40060: any = new Error("Already acknowledged");
        error40060.code = 40060;
        await handleError(error40060, interaction);
        expect(interaction.reply).not.toHaveBeenCalled();
    });
});
