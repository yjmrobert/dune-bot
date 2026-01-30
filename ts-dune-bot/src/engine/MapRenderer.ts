import { createCanvas, Canvas, CanvasRenderingContext2D, loadImage, Image } from 'canvas';
import { GameState, TerritoryState, Faction } from '../types';
import { ASSET_PATHS } from '../constants/visuals';
import { BOARD_MAP } from '../constants/map';
import * as fs from 'fs';

export class MapRenderer {
    // Map dimensions (Default to previous JSON values)
    private readonly MAP_WIDTH = 2821;
    private readonly MAP_HEIGHT = 3107;

    constructor() {
    }

    public async renderBoard(gameState: GameState): Promise<Buffer> {
        const width = this.MAP_WIDTH;
        const height = this.MAP_HEIGHT;

        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext('2d');

        // 1. Draw Background
        await this.drawBackground(ctx, width, height);

        // 2. Draw Storm
        await this.drawStorm(ctx, gameState.stormLocation);

        // 3. Draw Territories (Spice & Forces)
        await this.drawTerritories(ctx, gameState.boardState);

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
                ctx.drawImage(stormImage, 0, 0); 
            }
        } catch (err) {
            console.error("Failed to draw storm:", err);
        }
    }

    private async drawTerritories(ctx: CanvasRenderingContext2D, boardState: Record<string, TerritoryState>) {
        if (!boardState) return;

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
            // Lookup static map data for coordinates
            const staticData = BOARD_MAP[territory.name];
            
            if (!staticData) {
                // console.warn(`No static data for ${territory.name}`);
                continue;
            }

            // --- Draw Spice ---
            if (territory.spice > 0 && spiceImage) {
                // Find a sector with a spiceCoord
                const sectorWithSpice = staticData.sectors.find(s => s.spiceCoord);
                
                if (sectorWithSpice && sectorWithSpice.spiceCoord) {
                    const x = sectorWithSpice.spiceCoord.x;
                    const y = sectorWithSpice.spiceCoord.y;

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
                    ctx.strokeText(territory.spice.toString(), drawX + spiceImage.width, drawY + spiceImage.height);
                    ctx.fillText(territory.spice.toString(), drawX + spiceImage.width, drawY + spiceImage.height);
                    ctx.restore();
                }
            }

            // --- Draw Forces ---
            if (territory.forces) {
                // Iterate through sectors explicitly defined in the state
                for (const [sectorIdStr, factionCounts] of Object.entries(territory.forces)) {
                    const sectorId = parseInt(sectorIdStr);
                    const sectorDef = staticData.sectors.find(s => s.sector === sectorId);

                    if (!sectorDef) {
                        // console.warn(`Sector ${sectorId} not found in static definitions for ${territory.name}`);
                        continue;
                    }

                    const x = sectorDef.forceAnchor.x;
                    const y = sectorDef.forceAnchor.y;
                    
                    console.log(`Drawing forces for ${territory.name} (Sector ${sectorId}) at ${x},${y}`); // Below where spice might be (or just offset from anchor)

                    let offsetX = 0;
                    const offsetY = 60; // Below where spice might be (or just offset from anchor)

                    for (const [faction, count] of Object.entries(factionCounts)) {
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
}
