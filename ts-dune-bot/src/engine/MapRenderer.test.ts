import { describe, it, expect } from 'vitest';
import { MapRenderer } from './MapRenderer';
import { ImageView } from '../domain/imageViewModels';
import { loadImage } from 'canvas';

describe('MapRenderer', () => {
    const renderer = new MapRenderer();

    it('should render without scaling when dimensions are within limits', async () => {
        const view: ImageView = {
            width: 100,
            height: 100,
            sprites: [],
            labels: [],
            backgroundColor: '#ffffff'
        };

        const buffer = await renderer.render(view);

        // Verify output dimensions by loading it back
        const img = await loadImage(buffer);
        expect(img.width).toBe(100);
        expect(img.height).toBe(100);
    });

    it('should downscale when dimensions exceed 1920x1080', async () => {
        const view: ImageView = {
            width: 3840,
            height: 2160,
            sprites: [],
            labels: [],
            backgroundColor: '#ffffff'
        };

        const buffer = await renderer.render(view);

        const img = await loadImage(buffer);
        expect(img.width).toBe(1920);
        expect(img.height).toBe(1080);
    });

    it('should preserve aspect ratio when downscaling', async () => {
        const view: ImageView = {
            width: 3000,
            height: 1000,
            sprites: [],
            labels: [],
            backgroundColor: '#ffffff'
        };

        // Aspect Ratio is 3:1.
        // Max Width 1920. 1920 / 3 = 640 height.
        // Check fit.

        const buffer = await renderer.render(view);
        const img = await loadImage(buffer);

        expect(img.width).toBe(1920);
        expect(img.height).toBe(640);
    });
});
