
import { createCanvas, Canvas, CanvasRenderingContext2D, loadImage, Image } from 'canvas';
import { ImageView, ImageSprite, TextLabel } from '../domain/imageViewModels';
import * as fs from 'fs';

export class MapRenderer {
    // Kept Class name for compatibility, but it acts as Adapter

    // In-memory cache for loaded assets to improve performance?
    // For now simple load.

    public async render(view: ImageView): Promise<Buffer> {
        // 1. Render to full size canvas first
        const fullCanvas = createCanvas(view.width, view.height);
        const ctx = fullCanvas.getContext('2d');

        // Background Color
        if (view.backgroundColor) {
            ctx.fillStyle = view.backgroundColor;
            ctx.fillRect(0, 0, view.width, view.height);
        }

        // Draw Sprites
        for (const sprite of view.sprites) {
            await this.drawSprite(ctx, sprite);
        }

        // Draw Labels
        for (const label of view.labels) {
            this.drawLabel(ctx, label);
        }

        // 2. Calculate Scale to fit 1920x1080
        const MAX_WIDTH = 1920;
        const MAX_HEIGHT = 1080;

        let scale = 1;
        if (view.width > MAX_WIDTH || view.height > MAX_HEIGHT) {
            const widthScale = MAX_WIDTH / view.width;
            const heightScale = MAX_HEIGHT / view.height;
            scale = Math.min(widthScale, heightScale);
        }

        if (scale === 1) {
            return fullCanvas.toBuffer('image/png', { compressionLevel: 6, filters: Canvas.PNG_ALL_FILTERS });
        }

        // 3. Draw to scaled canvas
        const finalWidth = Math.floor(view.width * scale);
        const finalHeight = Math.floor(view.height * scale);

        const finalCanvas = createCanvas(finalWidth, finalHeight);
        const finalCtx = finalCanvas.getContext('2d');

        // Use high quality scaling if possible, though canvas mostly does bilinear
        finalCtx.drawImage(fullCanvas, 0, 0, finalWidth, finalHeight);

        return finalCanvas.toBuffer('image/png', { compressionLevel: 6, filters: Canvas.PNG_ALL_FILTERS });
    }

    private async drawSprite(ctx: CanvasRenderingContext2D, sprite: ImageSprite) {
        try {
            // Check file existence first to avoid throw?
            // loadImage throws if fail.
            if (!fs.existsSync(sprite.assetPath)) return;

            const img = await loadImage(sprite.assetPath);

            let drawX = sprite.x;
            let drawY = sprite.y;
            let drawW = sprite.width ?? img.width;
            let drawH = sprite.height ?? img.height;

            if (sprite.anchor === 'center') {
                drawX = sprite.x - (drawW / 2);
                drawY = sprite.y - (drawH / 2);
            }

            if (sprite.opacity !== undefined) {
                ctx.globalAlpha = sprite.opacity;
            }

            ctx.drawImage(img, drawX, drawY, drawW, drawH);

            ctx.globalAlpha = 1.0; // Reset
        } catch (e) {
            console.error(`Failed to draw sprite: ${sprite.assetPath}`, e);
        }
    }

    private drawLabel(ctx: CanvasRenderingContext2D, label: TextLabel) {
        ctx.save();
        if (label.font) ctx.font = label.font;
        ctx.fillStyle = label.color;

        if (label.textAlign) ctx.textAlign = label.textAlign as any; // canvas types mismatch sometimes

        if (label.strokeColor && label.strokeWidth) {
            ctx.strokeStyle = label.strokeColor;
            ctx.lineWidth = label.strokeWidth;
            ctx.strokeText(label.text, label.x, label.y);
        }

        ctx.fillText(label.text, label.x, label.y);
        ctx.restore();
    }
}
