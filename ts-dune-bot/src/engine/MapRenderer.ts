import { createCanvas, Canvas, CanvasRenderingContext2D, loadImage, Image } from 'canvas';
import { GameState, TerritoryState, Faction } from '../types';
import { ASSET_PATHS, Point } from '../constants/visuals';
import * as fs from 'fs';

interface LayoutData {
    Width: number;
    Height: number;
    Territories: TerritoryLayout[];
}

interface TerritoryLayout {
    Name: string;
    SpiceCoords: { X: number, Y: number };
    SpiceAmount: number;
    "Storm Sector"?: number;
}

export class MapRenderer {
    private layout: LayoutData | null = null;

    constructor() {
        this.loadLayout();
    }

    private loadLayout() {
        try {
            if (fs.existsSync(ASSET_PATHS.layout)) {
                const data = fs.readFileSync(ASSET_PATHS.layout, 'utf-8');
                this.layout = JSON.parse(data);
            } else {
                console.warn(`Layout file not found at ${ASSET_PATHS.layout}`);
            }
        } catch (err) {
            console.error("Failed to load layout:", err);
        }
    }

    public async renderBoard(gameState: GameState): Promise<Buffer> {
        // 1. Determine Dimensions
        const width = this.layout?.Width || 2821;
        const height = this.layout?.Height || 3107;

        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext('2d');

        // 2. Draw Background
        await this.drawBackground(ctx, width, height);

        // 3. Draw Storm
        await this.drawStorm(ctx, gameState.stormLocation);

        // 4. Draw Territories (Spice & Forces)
        await this.drawTerritories(ctx, gameState.boardState);

        // 5. Resize if needed (Optional, keeping full res for now)
        // If we want to scale down for Discord, we can do it here.
        // For now returning full res buffer.

        return canvas.toBuffer('image/png', { compressionLevel: 6, filters: Canvas.PNG_ALL_FILTERS });
    }

    private async drawBackground(ctx: CanvasRenderingContext2D, width: number, height: number) {
        try {
            const bgImage = await loadImage(ASSET_PATHS.mapBackground);
            ctx.drawImage(bgImage, 0, 0, width, height);
        } catch (err) {
            console.error("Failed to load background:", err);
            // Fallback
            ctx.fillStyle = '#EAC086';
            ctx.fillRect(0, 0, width, height);
        }
    }

    private async drawStorm(ctx: CanvasRenderingContext2D, sector: number) {
        // Storm assets are 1-based: storm_01.png
        const sectorStr = sector.toString().padStart(2, '0');
        const stormPath = `${ASSET_PATHS.stormOverlayPrefix}${sectorStr}.png`;

        try {
            if (fs.existsSync(stormPath)) {
                const stormImage = await loadImage(stormPath);
                // Assumption: Storm overlays are full-board size or positioned at 0,0
                // Based on C# code: image.Mutate(x => x.DrawImage(stormOverlay, 1f));
                // This implies they are full size overlays.
                ctx.drawImage(stormImage, 0, 0); 
            } else {
                 // console.warn(`Storm overlay not found: ${stormPath}`);
            }
        } catch (err) {
            console.error("Failed to draw storm:", err);
        }
    }

    private async drawTerritories(ctx: CanvasRenderingContext2D, boardState: Record<string, TerritoryState>) {
        if (!this.layout || !boardState) return;

        // Pre-load spice icon
        let spiceImage: Image | null = null;
        try {
            spiceImage = await loadImage(ASSET_PATHS.spiceIcon);
        } catch (e) { console.error("Missing spice icon"); }

        // Pre-load force icons
        const forceImages: Record<string, Image> = {};
        for (const [faction, path] of Object.entries(ASSET_PATHS.forces)) {
             try {
                if (fs.existsSync(path)) {
                    forceImages[faction] = await loadImage(path);
                }
             } catch (e) {}
        }

        for (const territory of Object.values(boardState)) {
            const layoutItem = this.layout.Territories.find(t => t.Name.toLowerCase() === territory.name.toLowerCase());
            
            // If no layout item found, we can't render it in the right place. 
            // In a real scenario we might have a fallback or log it.
            if (!layoutItem) continue;

            const x = layoutItem.SpiceCoords.X;
            const y = layoutItem.SpiceCoords.Y;

            // Draw Spice
            if (territory.spice > 0 && spiceImage) {
                // Center the image
                const drawX = x - (spiceImage.width / 2);
                const drawY = y - (spiceImage.height / 2);
                
                ctx.drawImage(spiceImage, drawX, drawY);

                // Draw Text
                ctx.save();
                ctx.fillStyle = 'white';
                ctx.strokeStyle = 'black';
                ctx.lineWidth = 3;
                ctx.font = 'bold 40px Arial';
                ctx.textAlign = 'right';
                // Offset text slightly
                ctx.strokeText(territory.spice.toString(), drawX + spiceImage.width, drawY + spiceImage.height);
                ctx.fillText(territory.spice.toString(), drawX + spiceImage.width, drawY + spiceImage.height);
                ctx.restore();
            }

            // Draw Forces
            // Since we don't have ForceSlots in the JSON (based on inspection), 
            // we'll stack them near the spice coords or offset them.
            if (territory.forces) {
                let offsetX = 0;
                const offsetY = 60; // Below spice

                for (const [faction, count] of Object.entries(territory.forces)) {
                    if (count > 0) {
                        const img = forceImages[faction];
                        if (img) {
                             // Draw icon
                             ctx.drawImage(img, x + offsetX - (img.width/2), y + offsetY);
                             
                             // Draw count
                             ctx.save();
                             ctx.fillStyle = 'white';
                             ctx.strokeStyle = 'black';
                             ctx.lineWidth = 3;
                             ctx.font = 'bold 30px Arial';
                             ctx.strokeText(count.toString(), x + offsetX + 20, y + offsetY + 40);
                             ctx.fillText(count.toString(), x + offsetX + 20, y + offsetY + 40);
                             ctx.restore();
                             
                             offsetX += 60; // Shift for next faction
                        }
                    }
                }
            }
        }
    }

}
