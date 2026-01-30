import * as fs from 'fs';
import * as path from 'path';

/**
 * Script to extract coordinates from an Affinity Designer/Photo exported SVG.
 * 
 * Usage: 
 * 1. Export your map layers as SVG (ensure layer names are preserved, Flatten OFF).
 * 2. Run: npx ts-node scripts/extract_coords.ts <path-to-svg>
 * 
 * Naming Convention Support:
 * - Force: TerritoryName_SectorN (e.g. "Arrakeen_Sector10")
 * - Spice: TerritoryName_SectorN_SpiceM (e.g. "Hagga_Basin_Sector3_Spice6")
 * 
 * Logic:
 * - Parse SVG for elements with IDs matching patterns.
 * - Handles group transforms (matrix/translate) recursively (simple stack).
 */

interface ExtractedPoint {
    territory: string;
    sector: number;
    type: 'Force' | 'Spice';
    amount?: number; // For Spice
    x: number;
    y: number;
}

const svgPath = process.argv[2];

if (!svgPath) {
    console.error("Please provide the path to the SVG file.");
    console.log("Usage: npx ts-node scripts/extract_coords.ts <path-to-svg>");
    process.exit(1);
}

const content = fs.readFileSync(svgPath, 'utf-8');

// Regex helpers
// Match ID="Name_SectorN" or "Name_SectorN_SpiceM"
// Territory names: Uppercase/lowercase letters, spaces, hyphens, apostrophes.
// But mostly IDs don't have spaces unless Affinity allows it? Affinity usually replaces spaces with underscores or entities.
// The user said: "<territoryName>_Sector<sectorNumber>"
// Let's assume territoryName can have underscores that map to spaces.

// Groups can have IDs too.
// We need a proper parser or a robust regex walker.
// Simple Walker:
// Find `<g ... transform="..." ...>` push transform.
// Find `</g>` pop transform.
// Find `<circle/rect ... id="..." ... x/cx="..." ... />` use current transform.

// Since we don't have an XML parser lib, we'll do a linear scan looking for tags.
// This relies on the SVG being well-formed.

const tagRegex = /<(\/?)(\w+)([^>]*)>/g;
let match;

interface Transform {
    x: number;
    y: number;
}

const transformStack: Transform[] = [{ x: 0, y: 0 }];
const extracted: ExtractedPoint[] = [];

function parseTransformAttribute(attr: string): Transform {
    let x = 0, y = 0;
    // matrix(a, b, c, d, e, f) -> e is x, f is y.
    const matrixMatch = attr.match(/matrix\(([^)]+)\)/);
    if (matrixMatch) {
        const vals = matrixMatch[1].split(/[,\s]+/).map(Number);
        if (vals.length >= 6) {
            x = vals[4];
            y = vals[5];
        }
    }
    
    // translate(x, y)
    const translateMatch = attr.match(/translate\(([^)]+)\)/);
    if (translateMatch) {
        const vals = translateMatch[1].split(/[,\s]+/).map(Number);
        x = vals[0];
        y = vals.length > 1 ? vals[1] : 0;
    }
    
    return { x, y };
}

// Current total offset
function getCurrentOffset() {
    let x = 0, y = 0;
    for (const t of transformStack) {
        x += t.x;
        y += t.y;
    }
    return { x, y };
}

while ((match = tagRegex.exec(content)) !== null) {
    const isClosing = match[1] === '/';
    const tagName = match[2];
    const attributes = match[3];

    if (tagName === 'g') {
        if (isClosing) {
            transformStack.pop();
        } else {
            // Check for transform
            const tMatch = attributes.match(/transform="([^"]+)"/);
            if (tMatch) {
                transformStack.push(parseTransformAttribute(tMatch[1]));
            } else {
                transformStack.push({ x: 0, y: 0 });
            }
        }
    } else if (!isClosing && (tagName === 'circle' || tagName === 'rect' || tagName === 'ellipse' || tagName === 'path' || tagName === 'use')) {
        // Warning: <use> might be the background, skip if ID is Background
        
        // Extract ID
        const idMatch = attributes.match(/id="([^"]+)"/);
        if (idMatch) {
            const id = idMatch[1];
            
            // Check Ignore list
            if (id === 'Background') continue;

            // Parse ID using User's Convention
            // Format 1 (Spice): Name_SectorN_SpiceM
            // Format 2 (Force): Name_SectorN
            
            let type: 'Force' | 'Spice' = 'Force';
            let sector = 0;
            let name = '';
            let amount = 0;

            const spiceMatch = id.match(/^(.*)_Sector(\d+)_Spice(\d+)$/);
            const forceMatch = id.match(/^(.*)_Sector(\d+)$/);

            if (spiceMatch) {
                name = spiceMatch[1];
                sector = parseInt(spiceMatch[2]);
                type = 'Spice';
                amount = parseInt(spiceMatch[3]);
            } else if (forceMatch) {
                name = forceMatch[1];
                sector = parseInt(forceMatch[2]);
                type = 'Force';
            } else {
                // Skip non-matching IDs (like "Sector1" group ID or "SpiceTokens" group)
                continue; 
            }

            // Clean Name: Replace underscores with spaces if needed, or keeping it if map.ts uses keys like "Sietch Tabr" (space)
            // The SVG usually has "Sietch_Tabr".
            name = name.replace(/_/g, ' '); 
            // Fix double spaces or weird chars if any? Usually fine.
            // Special fix: "Tuek-s Sietch" -> "Tuek's Sietch"? 
            // SVG might encode apostrophy. User file had: `Tuek-sSietch_Sector5` and `serif:id="Tuek'sSietch_Sector5"`.
            // We'll stick to the main ID. User can manually fix special names or we handle mapping.
            if (name.includes('Tuek-s')) name = name.replace('Tuek-s', "Tuek's");

            // Extract Coordinates
            let cx = 0, cy = 0;
            
            const cxMatch = attributes.match(/cx="([\d.-]+)"/);
            const cyMatch = attributes.match(/cy="([\d.-]+)"/);
            
            if (cxMatch && cyMatch) {
                cx = parseFloat(cxMatch[1]);
                cy = parseFloat(cyMatch[1]);
            } else {
                const xMatch = attributes.match(/x="([\d.-]+)"/); // Space logic tricky in regex but attributes start with space usually
                const yMatch = attributes.match(/y="([\d.-]+)"/);
                
                // rect x,y is top-left. We want center? 
                // User said "You can use the circle's cx and cy".
                // If it's a rect, maybe x + w/2?
                // Let's assume mostly circles. If rect, take x,y.
                if (xMatch && yMatch) {
                    cx = parseFloat(xMatch[1]);
                    cy = parseFloat(yMatch[1]);
                    
                    const wMatch = attributes.match(/width="([\d.-]+)"/);
                    const hMatch = attributes.match(/height="([\d.-]+)"/);
                    if (wMatch) cx += parseFloat(wMatch[1]) / 2;
                    if (hMatch) cy += parseFloat(hMatch[1]) / 2;
                }
            }

            // Apply global transform offset
            const offset = getCurrentOffset();
            const finalX = Math.round(cx + offset.x);
            const finalY = Math.round(cy + offset.y);

            extracted.push({
                territory: name,
                sector,
                type,
                amount,
                x: finalX,
                y: finalY
            });
        }
    }
}

// Output
const outputMap: Record<string, { sectors: Record<number, { force?: {x:number, y:number}, spice?: {x:number, y:number} }> }> = {};

extracted.forEach(p => {
    // Normalizing keys to match map.ts? 
    // map.ts keys: "Arrakeen", "Imperial Basin", "Sietch Tabr", etc.
    // Our 'name' comes from ID with underscores replaced.
    // e.g. "ImperialBasin" (if user didn't use underscore).
    // SVG inspection showed: "ImperialBasin_Sector9". No underscore!
    // SVG inspection showed: "HaggaBasin_Sector12".
    // SVG inspection showed: "Tuek-sSietch".
    // We need to insert spaces? "Imperial Basin".
    // Heuristic: Split CamelCase? Or user MapKeys lookup?
    
    // Hardcoded Mapping or Space Insertion
    let key = p.territory;
    
    // Try to insert space before capital letters if missing (simpleCamelCase split)
    // But be careful of "Sietch Tabr" -> "SietchTabr".
    // "ImperialBasin" -> "Imperial Basin".
    // "RedChasm" -> "Red Chasm".
    // "TheMinorErg" -> "The Minor Erg".
    
    // Only apply split if no spaces exist
    if (!key.includes(' ')) {
        key = key.replace(/([A-Z])/g, ' $1').trim();
    }
    
    // Fix specific edge cases if needed
    // "Tuek's Sietch" might be "Tuek's Sietch".
    // "Arrakeen" -> "Arrakeen".
    
    if (!outputMap[key]) outputMap[key] = { sectors: {} };
    if (!outputMap[key].sectors[p.sector]) outputMap[key].sectors[p.sector] = {};
    
    if (p.type === 'Force') {
        outputMap[key].sectors[p.sector].force = { x: p.x, y: p.y };
    } else {
        outputMap[key].sectors[p.sector].spice = { x: p.x, y: p.y };
    }
});

console.log("// --- Extracted Map Data ---");
for (const [name, data] of Object.entries(outputMap)) {
    console.log(`// ${name}`);
    
    // Sort sectors
    const sectors = Object.keys(data.sectors).map(Number).sort((a,b) => a-b);
    
    sectors.forEach(sectorNum => {
        const coords = data.sectors[sectorNum];
        const parts = [];
        parts.push(`sector: ${sectorNum}`);
        if (coords.force) parts.push(`forceAnchor: { x: ${coords.force.x}, y: ${coords.force.y} }`);
        if (coords.spice) parts.push(`spiceCoord: { x: ${coords.spice.x}, y: ${coords.spice.y} }`);
        
        console.log(`{ ${parts.join(', ')} },`);
    });
    console.log("");
}
