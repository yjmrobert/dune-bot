
import { MapRenderer } from '../src/engine/MapRenderer';
import { renderMap } from '../src/domain/mapPresenter';
import { GameState } from '../src/types';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
    console.log("Generating example render...");

    // Mock State
    const mockState: Partial<GameState> = {
        stormLocation: 3,
        boardState: {
            "Arrakeen": {
                name: "Arrakeen",
                spice: 0,
                forces: {
                    "10": { // Sector ID
                        "Atreides": 5,
                        "Harkonnen": 2
                    }
                }
            },
            "Sietch Tabr": {
                name: "Sietch Tabr",
                spice: 10,
                forces: {}
            }
        }
    };

    // 1. Presenter (Logic)
    console.log("Running MapPresenter...");
    const view = renderMap(mockState as GameState);
    console.log(`View created with ${view.sprites.length} sprites and ${view.labels.length} labels.`);

    // 2. Adapter (Renderer)
    console.log("Running MapRenderer (Adapter)...");
    const renderer = new MapRenderer();
    const buffer = await renderer.render(view);

    // Save
    const outputPath = path.join(process.cwd(), 'example_map.png');
    fs.writeFileSync(outputPath, buffer);
    console.log(`Saved render to ${outputPath}`);
}

main().catch(console.error);
