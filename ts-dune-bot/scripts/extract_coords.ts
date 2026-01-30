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
 * - Parse SVG for elements with IDs.
 * - Handles group transforms (matrix/translate) recursively.
 * - TRACKS IDs from parent Groups (stack), allowing <circle> inside <g id="ValidID"> to inherit it.
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

const tagRegex = /<(\/?)(\w+)([^>]*)>/g;
let match;

interface Transform {
    x: number;
    y: number;
}

// Context tracks the transform and the 'current active ID' inherited from groups
interface Context {
    transform: Transform;
    id: string | null;
}

// Stack of contexts
const contextStack: Context[] = [{ transform: { x: 0, y: 0 }, id: null }];

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
    for (const ctx of contextStack) {
        x += ctx.transform.x;
        y += ctx.transform.y;
    }
    return { x, y };
}

// Helper to check if an ID is a valid Map ID
function isValidMapId(id: string): boolean {
    return !!(id.match(/^(.*)_Sector(\d+)_Spice(\d+)$/) || id.match(/^(.*)_Sector(\d+)$/));
}

while ((match = tagRegex.exec(content)) !== null) {
    const isClosing = match[1] === '/';
    const tagName = match[2];
    const attributes = match[3];

    if (tagName === 'g') {
        if (isClosing) {
            contextStack.pop();
        } else {
            // Check for transform
            let newTransform = { x: 0, y: 0 };
            const tMatch = attributes.match(/transform="([^"]+)"/);
            if (tMatch) {
                newTransform = parseTransformAttribute(tMatch[1]);
            }

            // Check for ID
            const idMatch = attributes.match(/id="([^"]+)"/);
            let contextId = contextStack[contextStack.length - 1].id; // Default to parent ID

            // If this group has a relevant ID, it overrides the parent ID (became the new context ID)
            if (idMatch) {
                const id = idMatch[1];
                if (isValidMapId(id)) {
                    contextId = id;
                }
            }

            contextStack.push({ transform: newTransform, id: contextId });
        }
    } else if (!isClosing && (tagName === 'circle' || tagName === 'rect' || tagName === 'ellipse' || tagName === 'path' || tagName === 'use')) {
        // Warning: <use> might be the background, skip if ID is Background

        let id = contextStack[contextStack.length - 1].id;

        // Extract ID from element (overrides group ID if valid?)
        const idMatch = attributes.match(/id="([^"]+)"/);
        if (idMatch) {
            const selfId = idMatch[1];
            if (selfId === 'Background') continue;

            if (isValidMapId(selfId)) {
                id = selfId;
            }
        }

        if (!id) continue;

        // Parse ID
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
            continue;
        }

        // Clean Name
        name = name.replace(/_/g, ' ');
        if (name.includes('Tuek-s')) name = name.replace('Tuek-s', "Tuek's");

        // Extract Coordinates
        let cx = 0, cy = 0;

        const cxMatch = attributes.match(/cx="([\d.-]+)"/);
        const cyMatch = attributes.match(/cy="([\d.-]+)"/);

        if (cxMatch && cyMatch) {
            cx = parseFloat(cxMatch[1]);
            cy = parseFloat(cyMatch[1]);
        } else {
            const xMatch = attributes.match(/x="([\d.-]+)"/);
            const yMatch = attributes.match(/y="([\d.-]+)"/);

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

// Output
const outputMap: Record<string, Record<string, { force?: { x: number, y: number }, spice?: { x: number, y: number } }>> = {};

extracted.forEach(p => {
    let key = p.territory;

    // Only apply split if no spaces exist
    if (!key.includes(' ')) {
        key = key.replace(/([A-Z])/g, ' $1').trim();
    }

    // Match "Tuek's Sietch" properly 
    if (key.includes("Tuek's")) {
        // No-op or specific handling if needed, but the replace/clean above handles most
    }

    if (!outputMap[key]) outputMap[key] = {};
    const sectorKey = p.sector.toString();
    if (!outputMap[key][sectorKey]) outputMap[key][sectorKey] = {};

    if (p.type === 'Force') {
        outputMap[key][sectorKey].force = { x: p.x, y: p.y };
    } else {
        outputMap[key][sectorKey].spice = { x: p.x, y: p.y };
    }
});

console.log(JSON.stringify(outputMap, null, 2));
