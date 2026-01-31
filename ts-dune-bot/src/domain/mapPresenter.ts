
import { ImageView, ImageSprite, TextLabel } from './imageViewModels';
import { GameState } from '../types'; // Assuming types location
import { BOARD_MAP } from '../constants/map';
import { ASSET_PATHS } from '../constants/visuals';

const MAP_WIDTH = 2821;
const MAP_HEIGHT = 3107;

export function renderMap(state: GameState): ImageView {
    const sprites: ImageSprite[] = [];
    const labels: TextLabel[] = [];

    // 1. Background
    sprites.push({
        assetPath: ASSET_PATHS.mapBackground,
        x: 0,
        y: 0,
        width: MAP_WIDTH,
        height: MAP_HEIGHT
    });

    // 2. Storm
    // Storm assets are 1-based usually
    if (state.stormLocation !== undefined) {
        const sectorStr = state.stormLocation.toString().padStart(2, '0');
        const stormPath = `${ASSET_PATHS.stormOverlayPrefix}${sectorStr}.png`;
        sprites.push({
            assetPath: stormPath,
            x: 0,
            y: 0, // Storm overlays whole map usually? Based on MapRenderer logic 'ctx.drawImage(stormImage, 0, 0)' -> Yes.
            anchor: 'top-left'
        });
    }

    // 3. Territories
    if (state.boardState) {
        for (const territory of Object.values(state.boardState)) {
            const staticData = BOARD_MAP[territory.name];
            if (!staticData) continue;

            // Spice
            if (territory.spice > 0) {
                const sectorWithSpice = staticData.sectors.find(s => s.spiceCoord);
                if (sectorWithSpice && sectorWithSpice.spiceCoord) {
                    const { x, y } = sectorWithSpice.spiceCoord;

                    sprites.push({
                        assetPath: ASSET_PATHS.spiceIcon,
                        x: x,
                        y: y,
                        anchor: 'center'
                    });

                    // Approximate text position relative to icon (from renderer: x + width, y + height)
                    // Since we don't know exact dimension of generic icon here easily without loading it,
                    // we can estimate or the adapter handles 'center'.
                    // Presenter should ideally be precise or abstract.
                    // Let's assume standard offset for now or pass "anchor" logic to adapter?
                    // ViewModel has 'anchor'.
                    // Text logic in renderer: `drawX + spiceImage.width`
                    // If anchored center, drawX = x - w/2. Right Edge = x + w/2.
                    // So text is at x + w/2 + padding.
                    // Let's hardcode an offset for now based on typical icon size (~50px?)

                    labels.push({
                        text: territory.spice.toString(),
                        x: x + 40, // Guessing offset
                        y: y + 40,
                        color: 'white',
                        font: 'bold 40px Arial',
                        textAlign: 'right', // Renderer used right align
                        strokeColor: 'black',
                        strokeWidth: 3
                    });
                }
            }

            // Forces
            if (territory.forces) {
                for (const [sectorIdStr, factionCounts] of Object.entries(territory.forces)) {
                    const sectorId = parseInt(sectorIdStr);
                    const sectorDef = staticData.sectors.find(s => s.sector === sectorId);
                    if (!sectorDef) continue;

                    const baseX = sectorDef.forceAnchor.x;
                    const baseY = sectorDef.forceAnchor.y;

                    let offsetX = 0;
                    const offsetY = 60;

                    for (const [faction, count] of Object.entries(factionCounts ?? {})) {
                        const countNum = count as number;
                        if (countNum > 0) {
                            const assetPath = (ASSET_PATHS.forces as any)[faction];
                            if (assetPath) {
                                sprites.push({
                                    assetPath: assetPath,
                                    x: baseX + offsetX,
                                    y: baseY + offsetY,
                                    anchor: 'center' // Renderer did x - img.width/2
                                });

                                labels.push({
                                    text: countNum.toString(),
                                    x: baseX + offsetX + 20,
                                    y: baseY + offsetY + 40,
                                    color: 'white',
                                    font: 'bold 30px Arial',
                                    strokeColor: 'black',
                                    strokeWidth: 3
                                });

                                offsetX += 60;
                            }
                        }
                    }
                }
            }
        }
    }

    return {
        width: MAP_WIDTH,
        height: MAP_HEIGHT,
        sprites,
        labels
    };
}
