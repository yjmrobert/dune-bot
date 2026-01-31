
import { createCanvas, Canvas, CanvasRenderingContext2D, loadImage, Image } from 'canvas';
import { ImageView, ImageSprite, TextLabel } from '../domain/imageViewModels';
import * as fs from 'fs';

export class MapRenderer {
    // Kept Class name for compatibility, but it acts as Adapter

    // In-memory cache for loaded assets to improve performance?
    // For now simple load.

    public async render(view: ImageView): Promise<Buffer> {
        const canvas = createCanvas(view.width, view.height);
        const ctx = canvas.getContext('2d');

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

        return canvas.toBuffer('image/png', { compressionLevel: 6, filters: Canvas.PNG_ALL_FILTERS });
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
