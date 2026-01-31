
import { describe, it, expect } from 'vitest';
import { renderMap } from './mapPresenter';
import { GameState } from '../types';

describe('MapPresenter', () => {
    it('should include background and storm sprites', () => {
        const mockState: Partial<GameState> = {
            stormLocation: 1,
            boardState: {}
        };

        const view = renderMap(mockState as GameState);

        // Check Background
        expect(view.sprites[0].assetPath).toContain('board_base.png');

        // Check Storm
        const storm = view.sprites.find(s => s.assetPath.includes('storm_01.png'));
        expect(storm).toBeDefined();
        // Storm logic defaults (0,0) as per implementation
        expect(storm?.x).toBe(0);
    });

    // TODO: More complex tests would mock BOARD_MAP constant if possible or rely on known values
    // Since BOARD_MAP is imported directly, we test integration with it.
});
