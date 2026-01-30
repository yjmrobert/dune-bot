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
const visuals_1 = require("../constants/visuals");
const map_1 = require("../constants/map");
const fs = __importStar(require("fs"));
class MapRenderer {
    // Map dimensions (Default to previous JSON values)
    MAP_WIDTH = 2821;
    MAP_HEIGHT = 3107;
    constructor() {
    }
    async renderBoard(gameState) {
        const width = this.MAP_WIDTH;
        const height = this.MAP_HEIGHT;
        const canvas = (0, canvas_1.createCanvas)(width, height);
        const ctx = canvas.getContext('2d');
        // 1. Draw Background
        await this.drawBackground(ctx, width, height);
        // 2. Draw Storm
        await this.drawStorm(ctx, gameState.stormLocation);
        // 3. Draw Territories (Spice & Forces)
        await this.drawTerritories(ctx, gameState.boardState);
        return canvas.toBuffer('image/png', { compressionLevel: 6, filters: canvas_1.Canvas.PNG_ALL_FILTERS });
    }
    async drawBackground(ctx, width, height) {
        try {
            const bgImage = await (0, canvas_1.loadImage)(visuals_1.ASSET_PATHS.mapBackground);
            ctx.drawImage(bgImage, 0, 0, width, height);
        }
        catch (err) {
            console.error("Failed to load background:", err);
            // Fallback
            ctx.fillStyle = '#EAC086';
            ctx.fillRect(0, 0, width, height);
        }
    }
    async drawStorm(ctx, sector) {
        // Storm assets are 1-based: storm_01.png
        const sectorStr = sector.toString().padStart(2, '0');
        const stormPath = `${visuals_1.ASSET_PATHS.stormOverlayPrefix}${sectorStr}.png`;
        try {
            if (fs.existsSync(stormPath)) {
                const stormImage = await (0, canvas_1.loadImage)(stormPath);
                ctx.drawImage(stormImage, 0, 0);
            }
        }
        catch (err) {
            console.error("Failed to draw storm:", err);
        }
    }
    async drawTerritories(ctx, boardState) {
        if (!boardState)
            return;
        // Pre-load spice icon
        let spiceImage = null;
        try {
            spiceImage = await (0, canvas_1.loadImage)(visuals_1.ASSET_PATHS.spiceIcon);
        }
        catch (e) {
            console.error("Missing spice icon");
        }
        // Pre-load force icons
        const forceImages = {};
        for (const [faction, path] of Object.entries(visuals_1.ASSET_PATHS.forces)) {
            try {
                if (fs.existsSync(path)) {
                    forceImages[faction] = await (0, canvas_1.loadImage)(path);
                }
            }
            catch (e) { }
        }
        for (const territory of Object.values(boardState)) {
            // Lookup static map data for coordinates
            const staticData = map_1.BOARD_MAP[territory.name];
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
                                ctx.drawImage(img, x + offsetX - (img.width / 2), y + offsetY);
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
exports.MapRenderer = MapRenderer;
