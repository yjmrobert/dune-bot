"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const discordAdapter_1 = require("./discordAdapter");
(0, vitest_1.describe)('DiscordAdapter Review', () => {
    (0, vitest_1.describe)('serializeCommand Edge Cases', () => {
        (0, vitest_1.it)('should correctly handle missing target but present value', () => {
            // Broken in original: 'ATTACK:10' -> target='10', value=undefined
            // Expected: 'ATTACK::10' -> target='', value='10'
            const cmd = { type: 'ATTACK', value: '10' };
            (0, vitest_1.expect)((0, discordAdapter_1.serializeCommand)(cmd)).toBe('ATTACK::10');
            const deserialized = (0, discordAdapter_1.deserializeCommand)('ATTACK::10');
            (0, vitest_1.expect)(deserialized.type).toBe('ATTACK');
            (0, vitest_1.expect)(deserialized.target).toBeUndefined();
            (0, vitest_1.expect)(deserialized.value).toBe('10');
        });
        (0, vitest_1.it)('should throw if target contains delimiter', () => {
            // Broken in original: returns 'TEST:foo:bar' -> parts length 3? Ambiguous if values exist?
            // To ensure safety, we should forbid delimiters in content
            const cmd = { type: 'TEST', target: 'foo:bar' };
            (0, vitest_1.expect)(() => (0, discordAdapter_1.serializeCommand)(cmd)).toThrow();
        });
    });
    (0, vitest_1.describe)('mapToDiscordMessage Limits', () => {
        (0, vitest_1.it)('should chunk buttons into multiple rows if exceeding 5', () => {
            // Mock View with 6 buttons
            const buttons = Array.from({ length: 6 }).map((_, i) => ({
                label: `Btn ${i}`,
                style: 'PRIMARY',
                command: { type: 'TEST', value: `${i}` }
            }));
            const view = { buttons };
            const payload = (0, discordAdapter_1.mapToDiscordMessage)(view);
            // Access components (ActionRowBuilders)
            const rows = payload.components;
            (0, vitest_1.expect)(rows).toHaveLength(2);
            (0, vitest_1.expect)(rows[0].components.length).toBe(5);
            (0, vitest_1.expect)(rows[1].components.length).toBe(1);
        });
    });
});
