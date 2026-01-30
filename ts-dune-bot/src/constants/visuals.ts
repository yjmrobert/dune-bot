import * as path from 'path';

export interface Point {
    x: number;
    y: number;
}

export const ASSET_PATHS = {
    layout: path.join(process.cwd(), 'assets', 'board_layout.json'),
    mapBackground: path.join(process.cwd(), 'assets', 'board_base.png'), 
    spiceIcon: path.join(process.cwd(), 'assets', 'token_spice.png'),
    stormOverlayPrefix: path.join(process.cwd(), 'assets', 'storm_'), // storm_01.png etc
    
    // Faction Forces (guessing names based on file list or standardizing)
    forces: {
        "Atreides": path.join(process.cwd(), 'assets', 'troop_atreides.png'),
        "Harkonnen": path.join(process.cwd(), 'assets', 'troop_harkonnen.png'),
        "Fremen": path.join(process.cwd(), 'assets', 'troop_fremen.png'),
        "Emperor": path.join(process.cwd(), 'assets', 'troop_emperor.png'),
        "Guild": path.join(process.cwd(), 'assets', 'troop_tradeguild.png'),
        "BeneGesserit": path.join(process.cwd(), 'assets', 'troop_bg.png'),
        "BeneGesserit_Advisor": path.join(process.cwd(), 'assets', 'troop_bg_advisor.png')
    }
};
