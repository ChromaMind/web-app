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

// ENHANCED: More aggressive brightness boost with better curve
const boost = (v:number) => {
    // Ensure minimum brightness for any non-zero input
    if (v <= 0) return 0;

    // More aggressive boost curve: combines sqrt for low values + linear scaling
    const normalized = v / 255;
    const boosted = Math.min(1, 0.3 + (normalized * 0.7) + Math.sqrt(normalized) * 0.4);
    return clamp255(Math.round(boosted * 255));
};

// ENHANCED: Better energy-to-brightness mapping
const energyBrightness = (energy:number) => {
    // Minimum base brightness + energy scaling
    const minBright = 1; // 40% minimum brightness
    const normalized = energy / 255;
    return Math.min(1, minBright + (normalized * 0.6));
};

// ENHANCED: Scale color by brightness factor
const scaleColor = (color: RGB, brightnessFactor: number): RGB => {
    return [
        clamp255(Math.round(color[0] * brightnessFactor)),
        clamp255(Math.round(color[1] * brightnessFactor)),
        clamp255(Math.round(color[2] * brightnessFactor))
    ];
};

/** Beat-reactive color (hue ~ bass+time, sat ~ mids, val ~ treble) */
function beatColor(t:number, bass:number, mid:number, treble:number, energy:number = 128): RGB {
    const hue = (t * 80 + bass * 0.5) % 360;
    const sat = Math.min(1, 0.7 + (mid / 400)); // Slightly higher saturation

    // ENHANCED: Better brightness calculation using energy + treble
    const val = Math.min(1, 0.6 + (treble / 400) + (energy / 600));

    return hsvToRgb(hue, sat, val);
}

// ---------------- Patterns ----------------

const pArrow = ({ rows, cols, t, energy, bass, mid, treble }: PatternContext) => {
    const speed = 15 + (energy / 12);
    const pos = Math.floor((t * speed) % (cols * 2));
    const xHead = pos < cols ? pos : cols - 1 - (pos - cols);

    // ENHANCED: Use energy for brightness
    const baseColor = beatColor(t, bass, mid, treble, energy);
    const brightness = energyBrightness(energy);
    const col = scaleColor(baseColor, brightness);

    return makeFrame(rows, cols, (x) => (x === xHead ? col : OFF));
};

const pDoubleArrow = ({ rows, cols, t, bass, mid, treble, energy }: PatternContext) => {
    const speed = 12 + (bass / 20);
    const p = Math.floor((t * speed) % cols);
    const left = p, right = cols - 1 - p;

    // ENHANCED: Use bass + energy for brightness
    const baseColor = beatColor(t + 1, bass, mid, treble, energy);
    const brightness = Math.min(1, energyBrightness(bass) + energyBrightness(energy) * 0.3);
    const col = scaleColor(baseColor, brightness);

    return makeFrame(rows, cols, (x) => (x === left || x === right ? col : OFF));
};

const pExpand = ({ rows, cols, t, energy, bass, mid, treble }: PatternContext) => {
    const center = (cols - 1) / 2;
    const speed = 4 + (energy / 40);
    const radius = (Math.sin(t * speed) * 0.5 + 0.5) * center;

    // ENHANCED: Dynamic brightness based on expansion
    const expansionPhase = Math.sin(t * speed) * 0.5 + 0.5;
    const baseColor = beatColor(t + 2, bass, mid, treble, energy);
    const brightness = Math.min(1, energyBrightness(energy) + expansionPhase * 0.4);
    const col = scaleColor(baseColor, brightness);

    return makeFrame(rows, cols, (x) => (Math.abs(x - center) <= radius ? col : OFF));
};

// ENHANCED: Top row with much better brightness
const pTop = ({ rows, cols, treble, t, bass, mid, energy }: PatternContext) => {
    // Combine treble and energy for better brightness
    const val = Math.max(boost(treble), boost(energy * 0.8));
    const baseColor = beatColor(t, bass, mid, treble, energy);
    const brightness = Math.min(1, (val / 255) + 0.3); // Ensure minimum 30% brightness
    const col = scaleColor(baseColor, brightness);

    return makeFrame(rows, cols, (_x, y) => (y === 0 ? col : OFF));
};

// ENHANCED: Bottom row with much better brightness
const pBottom = ({ rows, cols, bass, t, mid, treble, energy }: PatternContext) => {
    // Combine bass and energy for better brightness
    const val = Math.max(boost(bass), boost(energy * 0.8));
    const baseColor = beatColor(t, bass, mid, treble, energy);
    const brightness = Math.min(1, (val / 255) + 0.3); // Ensure minimum 30% brightness
    const col = scaleColor(baseColor, brightness);

    return makeFrame(rows, cols, (_x, y) => (y === rows - 1 ? col : OFF));
};

// ENHANCED: Top + Bottom with better brightness
const pTopBottom = ({ rows, cols, bass, treble, t, mid, energy }: PatternContext) => {
    // Use the max of bass, treble, and energy for brightness
    const val = Math.max(boost((bass + treble) / 2), boost(energy * 0.9));
    const baseColor = beatColor(t, bass, mid, treble, energy);
    const brightness = Math.min(1, (val / 255) + 0.35); // Ensure minimum 35% brightness
    const col = scaleColor(baseColor, brightness);

    return makeFrame(rows, cols, (_x, y) => (y === 0 || y === rows - 1 ? col : OFF));
};

// ENHANCED: Shift pattern with better brightness
const pShift = ({ rows, cols, t, mid, bass, treble, energy }: PatternContext) => {
    const speed = 18 + (mid / 18);
    const s = Math.floor((t * speed) % cols);

    // Use mid and energy for brightness
    const baseColor = beatColor(t, bass, mid, treble, energy);
    const brightness = Math.min(1, energyBrightness(mid) + energyBrightness(energy) * 0.4);
    const col = scaleColor(baseColor, brightness);

    return makeFrame(rows, cols, (x) => (((x + s) % 2 === 0) ? col : OFF));
};

// ENHANCED: Sparkle with better brightness and more sparkles
const pSparkle = ({ rows, cols, energy, t, bass, mid, treble }: PatternContext) => {
    // Increase base density and make it more energy-reactive
    const density = 0.4 + (energy / 600); // Increased base density from 0.25
    const baseColor = beatColor(t, bass, mid, treble, energy);
    const brightness = energyBrightness(energy);
    const col = scaleColor(baseColor, brightness);

    return makeFrame(rows, cols, () => (Math.random() < density ? col : OFF));
};

// MUCH BRIGHTER: White pattern - always very bright
const pWhite = ({ rows, cols, energy }: PatternContext) => {
    // Always very bright, with slight energy variation
    const brightness = Math.max(0.95, energyBrightness(energy)); // 95% minimum brightness!
    const intensity = clamp255(Math.round(255 * brightness));
    return makeFrame(rows, cols, () => [intensity, intensity, intensity]);
};

// ENHANCED: Inward pattern with better brightness
const pInward = ({ rows, cols, t, bass, mid, treble, energy }: PatternContext) => {
    const speed = 14 + (bass / 24);
    const p = Math.floor((t * speed) % Math.ceil(cols / 2));
    const left = p, right = cols - 1 - p;

    // Use bass and energy for brightness
    const baseColor = beatColor(t, bass, mid, treble, energy);
    const brightness = Math.min(1, energyBrightness(bass) + energyBrightness(energy) * 0.3);
    const col = scaleColor(baseColor, brightness);

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

// ENHANCED: Better auto-switching with more variety
export function choosePatternIdAuto(bass: number, energy: number, t: number): PatternId {
    // if (energy < 180) return "white";
    // if (bass > 180)  return (Math.floor(t * 1.5) % 2 ? "expand" : "inward");
    // if (energy > 160) return "sparkle";
    return ALL_PATTERN_IDS[Math.floor((t * 1.5) % ALL_PATTERN_IDS.length)];
}
