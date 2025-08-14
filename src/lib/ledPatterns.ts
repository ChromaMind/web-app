// lib/ledPatterns.ts
export type RGB = [number, number, number];
export type FrameRGB = Uint8Array;
export type PatternId =
    | "arrow"
    | "double-arrow"
    | "top"
    | "bottom"
    | "top-bottom"
    | "shift"
    | "sparkle"
    | "white"
    | "inward";

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
const ON_WHITE: RGB = [255, 255, 255]; // used by "white" pattern

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

/* ===== Bright color picker (no fades) =====
   - Fixed neon palette (all channels near 255)
   - Deterministic per-frame via a fast hash of (x,y,frame)
*/
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

function hash32(x:number, y:number, f:number): number {
    // simple spatial+frame hash (all integers)
    let h = (x * 73856093) ^ (y * 19349663) ^ (f * 83492791);
    h ^= h >>> 16;
    h = (h * 0x7feb352d) | 0;
    h ^= h >>> 15;
    h = (h * 0x846ca68b) | 0;
    h ^= h >>> 16;
    return h >>> 0;
}

function brightColorFor(x:number, y:number, frameIdx:number): RGB {
    const idx = hash32(x, y, frameIdx) % BRIGHT_PALETTE.length;
    return BRIGHT_PALETTE[idx];
}

// Convert floating seconds to an integer frame index (no blending)
function frameIndex(t:number, fps:number = 30): number {
    return Math.floor(t * fps);
}

/* ===== Patterns (binary geometry; ON pixels get bright solid colors) ===== */

const pArrow = ({ rows, cols, t }: PatternContext) => {
    const f = frameIndex(t);
    const speed = 15;
    const pos = Math.floor((t * speed) % (cols * 2));
    const xHead = pos < cols ? pos : cols - 1 - (pos - cols);
    return makeFrame(rows, cols, (x, y) => (x === xHead ? brightColorFor(x, y, f) : OFF));
};
const pDoubleArrow = ({ rows, cols, t }: PatternContext) => {
    const f = frameIndex(t);
    const speed = 10; // increase for faster gap travel
    const halfCols = Math.ceil(cols / 2);

    // gap index moves from edges -> center, then wraps
    const p = Math.floor(t * speed) % halfCols;
    const leftGap = p;
    const rightGap = cols - 1 - p;

    // set to 2 if you want a thicker empty band
    const gapThickness = 1;

    return makeFrame(rows, cols, (x, y) => {
        const inLeftGap = Math.abs(x - leftGap) < gapThickness;
        const inRightGap = Math.abs(x - rightGap) < gapThickness;
        const off = inLeftGap || inRightGap;
        return off ? OFF : brightColorFor(x, y, f);
    });
};



const pTop = ({ rows, cols, t }: PatternContext) => {
    const f = frameIndex(t);
    return makeFrame(rows, cols, (x, y) => (y === 0 ? brightColorFor(x, y, f) : OFF));
};

const pBottom = ({ rows, cols, t }: PatternContext) => {
    const f = frameIndex(t);
    return makeFrame(rows, cols, (x, y) => (y === rows - 1 ? brightColorFor(x, y, f) : OFF));
};

const pTopBottom = ({ rows, cols, t }: PatternContext) => {
    const f = frameIndex(t);
    return makeFrame(rows, cols, (x, y) =>
        (y === 0 || y === rows - 1) ? brightColorFor(x, y, f) : OFF
    );
};

const pShift = ({ rows, cols, t }: PatternContext) => {
    const f = frameIndex(t);
    const speed = 18;
    const s = Math.floor((t * speed) % cols);
    return makeFrame(rows, cols, (x, y) => (((x + s) % 2 === 0) ? brightColorFor(x, y, f) : OFF));
};

const pSparkle = ({ rows, cols, t }: PatternContext) => {
    const f = frameIndex(t);
    const density = 0.5; // 0..1 fraction of pixels ON per frame
    return makeFrame(rows, cols, (x, y) => (Math.random() < density ? brightColorFor(x, y, f) : OFF));
};

const pWhite = ({ rows, cols }: PatternContext) =>
    makeFrame(rows, cols, () => ON_WHITE); // all ON, solid white

const pInward = ({ rows, cols, t }: PatternContext) => {
    const f = frameIndex(t);
    const speed = 14;
    const p = Math.floor((t * speed) % Math.ceil(cols / 2));
    const left = p, right = cols - 1 - p;
    return makeFrame(rows, cols, (x, y) => (x === left || x === right ? brightColorFor(x, y, f) : OFF));
};

export const PATTERNS: Record<PatternId, (c: PatternContext) => FrameRGB> = {
    arrow: pArrow,
    "double-arrow": pDoubleArrow,
    top: pTop,
    bottom: pBottom,
    "top-bottom": pTopBottom,
    shift: pShift,
    sparkle: pSparkle,
    white: pWhite,
    inward: pInward,
};

export const ALL_PATTERN_IDS: PatternId[] = [
    "arrow",
    "double-arrow",
    "top",
    "bottom",
    "top-bottom",
    "shift",
    "sparkle",
    "white",
    "inward",
];

export const PATTERN_LABELS: Record<PatternId, string> = {
    arrow: "↔ Arrow",
    "double-arrow": "⇄ Double Arrow",
    top: "Top Row",
    bottom: "Bottom Row",
    "top-bottom": "Top + Bottom",
    shift: "Shift",
    sparkle: "Random Sparkle",
    white: "Full White",
    inward: ">-< Inward",
};

export const renderPattern = (id: PatternId, ctx: PatternContext) => PATTERNS[id](ctx);

// simple round-robin auto (no audio coupling)
export function choosePatternIdAuto(_bass: number, _energy: number, t: number): PatternId {
    return ALL_PATTERN_IDS[Math.floor((t * 1.5) % ALL_PATTERN_IDS.length)];
}
