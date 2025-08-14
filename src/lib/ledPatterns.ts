// lib/ledPatterns.ts
export type RGB = [number, number, number];
export type FrameRGB = Uint8Array;
export type PatternId =
    | "arrow"
    | "double-arrow"
    // | "expandexpand"
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
    t: number;        // seconds since start
    bass: number;     // 0..255
    mid: number;      // 0..255
    treble: number;   // 0..255
    energy: number;   // 0..255
}

export const toPhysicalIndex = (x:number, y:number, cols:number) =>
    y % 2 === 0 ? y * cols + x : y * cols + (cols - 1 - x);

const OFF: RGB = [0, 0, 0];

const clamp255 = (v:number) => (v < 0 ? 0 : v > 255 ? 255 : v) | 0;

/** HSV (0..360, 0..1, 0..1) → RGB (0..255 ints) */
function hsvToRgb(h:number, s:number, v:number): RGB {
    h = (h % 360 + 360) % 360;
    const c = v * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = v - c;
    let r = 0, g = 0, b = 0;
    if (h < 60)       { r = c; g = x; b = 0; }
    else if (h < 120) { r = x; g = c; b = 0; }
    else if (h < 180) { r = 0; g = c; b = x; }
    else if (h < 240) { r = 0; g = x; b = c; }
    else if (h < 300) { r = x; g = 0; b = c; }
    else              { r = c; g = 0; b = x; }
    return [
        clamp255(Math.round((r + m) * 255)),
        clamp255(Math.round((g + m) * 255)),
        clamp255(Math.round((b + m) * 255)),
    ];
}

const makeFrame = (rows:number, cols:number, colorAt:(x:number,y:number)=>RGB) => {
    const out = new Uint8Array(rows * cols * 3);
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            const [r, g, b] = colorAt(x, y);
            const base = toPhysicalIndex(x, y, cols) * 3;
            out[base] = r | 0; out[base + 1] = g | 0; out[base + 2] = b | 0;
        }
    }
    return out;
};

// Nonlinear boost so mid levels look brighter without blowing out highs
const boost = (v:number) => Math.min(255, Math.pow(v / 255, 0.7) * 255) | 0;

/** Beat-reactive color (hue ~ bass+time, sat ~ mids, val ~ treble) */
function beatColor(t:number, bass:number, mid:number, treble:number): RGB {
    const hue = (t * 80 + bass * 0.5) % 360;
    const sat = Math.min(1, 0.6 + (mid / 510));
    const val = Math.min(1, 0.5 + (treble / 510));
    return hsvToRgb(hue, sat, val);
}

// ---------------- Patterns ----------------

const pArrow = ({ rows, cols, t, energy, bass, mid, treble }: PatternContext) => {
    const speed = 15 + (energy / 12);
    const pos = Math.floor((t * speed) % (cols * 2));
    const xHead = pos < cols ? pos : cols - 1 - (pos - cols);
    const col = beatColor(t, bass, mid, treble);
    return makeFrame(rows, cols, (x) => (x === xHead ? col : OFF));
};

const pDoubleArrow = ({ rows, cols, t, bass, mid, treble }: PatternContext) => {
    const speed = 12 + (bass / 20);
    const p = Math.floor((t * speed) % cols);
    const left = p, right = cols - 1 - p;
    const col = beatColor(t + 1, bass, mid, treble);
    return makeFrame(rows, cols, (x) => (x === left || x === right ? col : OFF));
};

const pExpand = ({ rows, cols, t, energy, bass, mid, treble }: PatternContext) => {
    const center = (cols - 1) / 2;
    const speed = 4 + (energy / 40);
    const radius = (Math.sin(t * speed) * 0.5 + 0.5) * center;
    const col = beatColor(t + 2, bass, mid, treble);
    return makeFrame(rows, cols, (x) => (Math.abs(x - center) <= radius ? col : OFF));
};

// Top row only (brightness ~ treble)
const pTop = ({ rows, cols, treble, t, bass, mid }: PatternContext) => {
    const val = boost(treble);
    const base = beatColor(t, bass, mid, treble);
    const col: RGB = [
        (base[0] * val / 255) | 0,
        (base[1] * val / 255) | 0,
        (base[2] * val / 255) | 0,
    ];
    return makeFrame(rows, cols, (_x, y) => (y === 0 ? col : OFF));
};

// Bottom row only (brightness ~ bass)
const pBottom = ({ rows, cols, bass, t, mid, treble }: PatternContext) => {
    const val = boost(bass);
    const base = beatColor(t, bass, mid, treble);
    const col: RGB = [
        (base[0] * val / 255) | 0,
        (base[1] * val / 255) | 0,
        (base[2] * val / 255) | 0,
    ];
    return makeFrame(rows, cols, (_x, y) => (y === rows - 1 ? col : OFF));
};

// Top + Bottom rows together (brightness ~ avg of bass & treble)
const pTopBottom = ({ rows, cols, bass, treble, t, mid }: PatternContext) => {
    const val = boost((bass + treble) / 2);
    const base = beatColor(t, bass, mid, treble);
    const col: RGB = [
        (base[0] * val / 255) | 0,
        (base[1] * val / 255) | 0,
        (base[2] * val / 255) | 0,
    ];
    return makeFrame(rows, cols, (_x, y) => (y === 0 || y === rows - 1 ? col : OFF));
};

const pShift = ({ rows, cols, t, mid, bass, treble }: PatternContext) => {
    const speed = 18 + (mid / 18);
    const s = Math.floor((t * speed) % cols);
    const col = beatColor(t, bass, mid, treble);
    return makeFrame(rows, cols, (x) => (((x + s) % 2 === 0) ? col : OFF));
};

const pSparkle = ({ rows, cols, energy, t, bass, mid, treble }: PatternContext) => {
    const density = 0.25 + (energy / 1020);
    const col = beatColor(t, bass, mid, treble);
    return makeFrame(rows, cols, () => (Math.random() < density ? col : OFF));
};

const pWhite = ({ rows, cols }: PatternContext) =>
    makeFrame(rows, cols, () => [255, 255, 255]);

const pInward = ({ rows, cols, t, bass, mid, treble }: PatternContext) => {
    const speed = 14 + (bass / 24);
    const p = Math.floor((t * speed) % Math.ceil(cols / 2));
    const left = p, right = cols - 1 - p;
    const col = beatColor(t, bass, mid, treble);
    return makeFrame(rows, cols, (x) => (x === left || x === right ? col : OFF));
};

export const PATTERNS: Record<PatternId, (c: PatternContext) => FrameRGB> = {
    arrow: pArrow,
    "double-arrow": pDoubleArrow,
    // expand: pExpand,
    top: pTop,
    bottom: pBottom,
    "top-bottom": pTopBottom,
    shift: pShift,
    sparkle: pSparkle,
    white: pWhite,
    inward: pInward,
};

// Keep this authoritative and in the UI (no hardcoded strings there)
export const ALL_PATTERN_IDS: PatternId[] = [
    "arrow",
    "double-arrow",
    // "expand",
    "top",
    "bottom",
    "top-bottom",
    "shift",
    "sparkle",
    "white",
    "inward",
];

// Pretty labels for the select UI
export const PATTERN_LABELS: Record<PatternId, string> = {
    arrow: "↔ Arrow",
    "double-arrow": "⇄ Double Arrow",
    // expand: "Expanding",
    top: "Top Row",
    bottom: "Bottom Row",
    "top-bottom": "Top + Bottom",
    shift: "Shift",
    sparkle: "Random Sparkle",
    white: "Full White",
    inward: ">-< Inward",
};

export const renderPattern = (id: PatternId, ctx: PatternContext) =>
    PATTERNS[id](ctx);

// Auto-switching: swap patterns faster and react to bass/energy
export function choosePatternIdAuto(bass: number, energy: number, t: number): PatternId {
    // if (energy < 180) return "white";
    // if (bass > 180)  return (Math.floor(t * 1.5) % 2 ? "expand" : "inward");
    // if (energy > 160) return "sparkle";
    return ALL_PATTERN_IDS[Math.floor((t * 1.5) % ALL_PATTERN_IDS.length)];
}
