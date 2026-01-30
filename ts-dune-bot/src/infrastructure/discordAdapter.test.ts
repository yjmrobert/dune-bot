import { describe, it, expect } from 'vitest';
import { serializeCommand, deserializeCommand, mapToDiscordMessage } from './discordAdapter';
import { GameView, GameButton } from '../domain/viewModels';

describe('DiscordAdapter Review', () => {
    describe('serializeCommand Edge Cases', () => {
        it('should correctly handle missing target but present value', () => {
            // Broken in original: 'ATTACK:10' -> target='10', value=undefined
            // Expected: 'ATTACK::10' -> target='', value='10'
            const cmd = { type: 'ATTACK', value: '10' };
            expect(serializeCommand(cmd)).toBe('ATTACK::10');

            const deserialized = deserializeCommand('ATTACK::10');
            expect(deserialized.type).toBe('ATTACK');
            expect(deserialized.target).toBeUndefined();
            expect(deserialized.value).toBe('10');
        });

        it('should throw if target contains delimiter', () => {
            // Broken in original: returns 'TEST:foo:bar' -> parts length 3? Ambiguous if values exist?
            // To ensure safety, we should forbid delimiters in content
            const cmd = { type: 'TEST', target: 'foo:bar' };
            expect(() => serializeCommand(cmd)).toThrow();
        });
    });

    describe('mapToDiscordMessage Limits', () => {
        it('should chunk buttons into multiple rows if exceeding 5', () => {
            // Mock View with 6 buttons
            const buttons: GameButton[] = Array.from({ length: 6 }).map((_, i) => ({
                label: `Btn ${i}`,
                style: 'PRIMARY',
                command: { type: 'TEST', value: `${i}` }
            }));

            const view: GameView = { buttons };
            const payload = mapToDiscordMessage(view);

            // Access components (ActionRowBuilders)
            const rows = payload.components as any[];
            expect(rows).toHaveLength(2);
            expect(rows[0].components.length).toBe(5);
            expect(rows[1].components.length).toBe(1);
        });
    });
});
