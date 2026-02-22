/**
 * Display/Monitor configuration
 */
export interface Display {
    id: string;
    name: string;
    isPrimary: boolean;
    bounds: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
}

/**
 * Display window configuration
 */
export interface DisplayWindow {
    type: 'audience' | 'confidence' | 'lowerthirds' | 'preservice-music';
    displayId: string;
    isOpen: boolean;
    bounds?: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
}
