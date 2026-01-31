"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const mapPresenter_1 = require("./mapPresenter");
(0, vitest_1.describe)('MapPresenter', () => {
    (0, vitest_1.it)('should include background and storm sprites', () => {
        const mockState = {
            stormLocation: 1,
            boardState: {}
        };
        const view = (0, mapPresenter_1.renderMap)(mockState);
        // Check Background
        (0, vitest_1.expect)(view.sprites[0].assetPath).toContain('board_base.png');
        // Check Storm
        const storm = view.sprites.find(s => s.assetPath.includes('storm_01.png'));
        (0, vitest_1.expect)(storm).toBeDefined();
        // Storm logic defaults (0,0) as per implementation
        (0, vitest_1.expect)(storm?.x).toBe(0);
    });
    // TODO: More complex tests would mock BOARD_MAP constant if possible or rely on known values
    // Since BOARD_MAP is imported directly, we test integration with it.
});
