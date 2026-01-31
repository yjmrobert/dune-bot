"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.MapRenderer = void 0;
const canvas_1 = require("canvas");
const fs = __importStar(require("fs"));
class MapRenderer {
    // Kept Class name for compatibility, but it acts as Adapter
    // In-memory cache for loaded assets to improve performance?
    // For now simple load.
    async render(view) {
        // 1. Render to full size canvas first
        const fullCanvas = (0, canvas_1.createCanvas)(view.width, view.height);
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
            return fullCanvas.toBuffer('image/png', { compressionLevel: 6, filters: canvas_1.Canvas.PNG_ALL_FILTERS });
        }
        // 3. Draw to scaled canvas
        const finalWidth = Math.floor(view.width * scale);
        const finalHeight = Math.floor(view.height * scale);
        const finalCanvas = (0, canvas_1.createCanvas)(finalWidth, finalHeight);
        const finalCtx = finalCanvas.getContext('2d');
        // Use high quality scaling if possible, though canvas mostly does bilinear
        finalCtx.drawImage(fullCanvas, 0, 0, finalWidth, finalHeight);
        return finalCanvas.toBuffer('image/png', { compressionLevel: 6, filters: canvas_1.Canvas.PNG_ALL_FILTERS });
    }
    async drawSprite(ctx, sprite) {
        try {
            // Check file existence first to avoid throw?
            // loadImage throws if fail.
            if (!fs.existsSync(sprite.assetPath))
                return;
            const img = await (0, canvas_1.loadImage)(sprite.assetPath);
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
        }
        catch (e) {
            console.error(`Failed to draw sprite: ${sprite.assetPath}`, e);
        }
    }
    drawLabel(ctx, label) {
        ctx.save();
        if (label.font)
            ctx.font = label.font;
        ctx.fillStyle = label.color;
        if (label.textAlign)
            ctx.textAlign = label.textAlign; // canvas types mismatch sometimes
        if (label.strokeColor && label.strokeWidth) {
            ctx.strokeStyle = label.strokeColor;
            ctx.lineWidth = label.strokeWidth;
            ctx.strokeText(label.text, label.x, label.y);
        }
        ctx.fillText(label.text, label.x, label.y);
        ctx.restore();
    }
}
exports.MapRenderer = MapRenderer;
