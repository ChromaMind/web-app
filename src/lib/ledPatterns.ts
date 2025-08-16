// lib/ledPatterns.ts
export type RGB = [number, number, number];
export type FrameRGB = Uint8Array;
export type PatternId =
    | "left-eye"
    | "right-eye"
    | "full-color"
    | "full-white";

export interface PatternContext {
    rows: number;
    cols: number;
    t: number;        // seconds since start (float)
    bass: number;     // unused in binary color logic
    mid: number;      // unused
    treble: number;   // unused
    energy: number;   // unused
}

export const toPhysicalIndex = (x:number, y:number, cols:number) =>
    y % 2 === 0 ? y * cols + x : y * cols + (cols - 1 - x);

const OFF: RGB = [0, 0, 0];
const ON_WHITE: RGB = [255, 255, 255];

const makeFrame = (rows:number, cols:number, colorAt:(x:number,y:number)=>RGB) => {
    const out = new Uint8Array(rows * cols * 3);
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            const [r, g, b] = colorAt(x, y);
            const base = toPhysicalIndex(x, y, cols) * 3;
            out[base] = r; out[base + 1] = g; out[base + 2] = b;
        }
    }
    return out;
};

/* ===== Bright color picker (cycling through colors over time) ===== */
const BRIGHT_PALETTE: RGB[] = [
    [255,   0,   0], // red
    [  0, 255,   0], // lime
    [  0,   0, 255], // blue
    [255, 255,   0], // yellow
    [255,   0, 255], // magenta
    [  0, 255, 255], // cyan
    [255, 128,   0], // orange
    [128,   0, 255], // violet
    [255,  20, 147], // deeppink
    [ 50, 205,  50], // limegreen
    [135, 206, 250], // lightskyblue
    [255, 105, 180], // hotpink
    [  0, 255, 127], // spring green
    [173, 255,  47], // greenyellow
    [255,  69,   0], // orangered
    [124, 252,   0], // lawn green
];

// Get current color based on time (cycles through palette)
function getCurrentColor(t: number, cycleDuration: number = 2.0): RGB {
    const colorIndex = Math.floor((t / cycleDuration) % BRIGHT_PALETTE.length);
    return BRIGHT_PALETTE[colorIndex];
}

/* ===== New Patterns ===== */

const pLeftEye = ({ rows, cols, t }: PatternContext) => {
    const color = getCurrentColor(t);
    const leftHalf = Math.floor(cols / 2);

    return makeFrame(rows, cols, (x, y) => {
        return x < leftHalf ? color : OFF;
    });
};

const pRightEye = ({ rows, cols, t }: PatternContext) => {
    const color = getCurrentColor(t);
    const leftHalf = Math.floor(cols / 2);

    return makeFrame(rows, cols, (x, y) => {
        return x >= leftHalf ? color : OFF;
    });
};

const pFullColor = ({ rows, cols, t }: PatternContext) => {
    const color = getCurrentColor(t);

    return makeFrame(rows, cols, (x, y) => color);
};

const pFullWhite = ({ rows, cols }: PatternContext) => {
    return makeFrame(rows, cols, () => ON_WHITE);
};

export const PATTERNS: Record<PatternId, (c: PatternContext) => FrameRGB> = {
    "left-eye": pLeftEye,
    "right-eye": pRightEye,
    "full-color": pFullColor,
    "full-white": pFullWhite,
};

export const ALL_PATTERN_IDS: PatternId[] = [
    "left-eye",
    "right-eye",
    "full-color",
    "full-white",
];

export const PATTERN_LABELS: Record<PatternId, string> = {
    "left-eye": "Left Eye",
    "right-eye": "Right Eye",
    "full-color": "Full Color",
    "full-white": "Full White",
};

export const renderPattern = (id: PatternId, ctx: PatternContext) => PATTERNS[id](ctx);

// simple round-robin auto (no audio coupling)
export function choosePatternIdAuto(_bass: number, _energy: number, t: number): PatternId {
    return ALL_PATTERN_IDS[Math.floor((t * 0.5) % ALL_PATTERN_IDS.length)];
}