
export interface Point {
    x: number;
    y: number;
}

export interface ImageSprite {
    assetPath: string; // Absolute path to the image file
    x: number;
    y: number;
    width?: number; // Optional override
    height?: number; // Optional override
    anchor?: 'center' | 'top-left'; // default top-left usually, but center is useful for icons
    opacity?: number;
}

export interface TextLabel {
    text: string;
    x: number;
    y: number;
    color: string;
    font?: string; // e.g. "bold 30px Arial"
    textAlign?: 'left' | 'center' | 'right';
    strokeColor?: string;
    strokeWidth?: number;
}

export interface ImageView {
    width: number;
    height: number;
    backgroundColor?: string;
    // Layers driven by order in array? Or explicit layers?
    // Arrays are naturally ordered (painter's algorithm).
    sprites: ImageSprite[];
    labels: TextLabel[];
}
