// lib/ledPatterns.ts
export type RGB = [number, number, number];
export type FrameRGB = Uint8Array;

export type PatternId =
    | "left-eye"
    | "right-eye"
    | "full-color"
    | "full-white"
    | "full-black"
    | "eye-shift"
    | "eye-wave-shift"
    | "eye-bounce-shift"
    | "eye-breathing-shift"
    | "eye-chase-shift";

export interface PatternContext {
    rows: number;
    cols: number;
    t: number;        // seconds since start (float)
    bass: number;     // 0..255
    mid: number;      // 0..255
    treble: number;   // 0..255
    energy: number;   // 0..255 (avg)
}

export const toPhysicalIndex = (x: number, y: number, cols: number) =>
    y % 2 === 0 ? y * cols + x : y * cols + (cols - 1 - x);

const OFF: RGB = [0, 0, 0];
const ON_WHITE: RGB = [255, 255, 255];

const makeFrame = (rows: number, cols: number, colorAt: (x: number, y: number) => RGB) => {
    const out = new Uint8Array(rows * cols * 3);
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            const [r, g, b] = colorAt(x, y);
            const base = toPhysicalIndex(x, y, cols) * 3;
            out[base] = r;
            out[base + 1] = g;
            out[base + 2] = b;
        }
    }
    return out;
};

/* ===== Bright color picker ===== */
const BRIGHT_PALETTE: RGB[] = [
    [255,   0,   0], // Red
    [  0, 255,   0], // Green
    [  0,   0, 255], // Blue
    [255, 255,   0], // Yellow
    [255,   0, 255], // Magenta
    [  0, 255, 255], // Cyan
    [255, 255, 255], // White
];

function getCurrentColor(t: number, cycleDuration = 2.0): RGB {
    const idx = Math.floor((t / cycleDuration) % BRIGHT_PALETTE.length);
    return BRIGHT_PALETTE[idx];
}

/* ===== Patterns ===== */
const pLeftEye = ({ rows, cols, t }: PatternContext) => {
    const color = getCurrentColor(t);
    const leftHalf = Math.floor(cols / 2);
    return makeFrame(rows, cols, (x) => (x < leftHalf ? color : OFF));
};

const pRightEye = ({ rows, cols, t }: PatternContext) => {
    const color = getCurrentColor(t);
    const leftHalf = Math.floor(cols / 2);
    return makeFrame(rows, cols, (x) => (x >= leftHalf ? color : OFF));
};

const pFullColor = ({ rows, cols, t }: PatternContext) => {
    const color = getCurrentColor(t);
    return makeFrame(rows, cols, () => color);
};

const pFullWhite = ({ rows, cols }: PatternContext) =>
    makeFrame(rows, cols, () => ON_WHITE);

const pFullBlack = ({ rows, cols }: PatternContext) =>
    makeFrame(rows, cols, () => OFF);

/* NEW: Left/Right shift (smooth crossfade, no jitter) */
const SHIFT_BASE_HZ = 2;               // flips per second
const EDGE_FRAC = 0.18;                // width of crossfade (0..0.5)
const TWO_PI = Math.PI * 2;

function smoothstep(e0: number, e1: number, x: number) {
    const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
    return t * t * (3 - 2 * t);
}

const pEyeShift = ({ rows, cols, t /*, bass*/ }: PatternContext) => {
    // keep freq stable to avoid phase jumps; remove bass-based modulation
    const hz = SHIFT_BASE_HZ;

    // phase 0..1 (one flip per cycle at 0.5 => flips/sec == hz)
    const phase = (t * hz) % 1;

    const color = getCurrentColor(t);
    const leftHalf = Math.floor(cols / 2);

    return makeFrame(rows, cols, (x) => {
        if (x < leftHalf) {
            return phase < 0.5 ? color : OFF;
        } else {
            return phase >= 0.5 ? color : OFF;
        }
    });
};

// Wave Shift - sine wave balance instead of hard flip
const pEyeWaveShift = ({ rows, cols, t }: PatternContext) => {
    const hz = SHIFT_BASE_HZ * 0.8;
    const wave = Math.sin(t * hz * TWO_PI);
    const balance = (wave + 1) * 0.5; // 0..1

    const leftLevel = 0.3 + 0.7 * (1 - balance);  // 0.3..1
    const rightLevel = 0.3 + 0.7 * balance;       // 0.3..1

    const color = getCurrentColor(t);
    const leftHalf = Math.floor(cols / 2);

    return makeFrame(rows, cols, (x) => {
        const lvl = (x < leftHalf) ? leftLevel : rightLevel;
        const r = (color[0] * lvl) | 0;
        const g = (color[1] * lvl) | 0;
        const b = (color[2] * lvl) | 0;
        return [r, g, b];
    });
};

// Bounce Shift - bouncing ball effect
const pEyeBounceShift = ({ rows, cols, t }: PatternContext) => {
    const hz = SHIFT_BASE_HZ * 0.75;
    let phase = (t * hz) % 1;
    const bounce = Math.abs(Math.sin(phase * Math.PI));

    const leftLevel = 1 - bounce;
    const rightLevel = bounce;

    const color = getCurrentColor(t);
    const leftHalf = Math.floor(cols / 2);

    return makeFrame(rows, cols, (x) => {
        const lvl = (x < leftHalf) ? leftLevel : rightLevel;
        if (lvl <= 0.001) return OFF;
        const r = (color[0] * lvl) | 0;
        const g = (color[1] * lvl) | 0;
        const b = (color[2] * lvl) | 0;
        return [r, g, b];
    });
};

// Breathing Shift - both eyes breathe together with slight left/right bias
const pEyeBreathingShift = ({ rows, cols, t }: PatternContext) => {
    const breatheHz = SHIFT_BASE_HZ * 0.5;
    const shiftHz = SHIFT_BASE_HZ * 0.3;

    const breathe = (Math.sin(t * breatheHz * TWO_PI) + 1) * 0.5;
    const shift = (Math.sin(t * shiftHz * TWO_PI) + 1) * 0.5;

    const baseBrightness = 0.2 + breathe * 0.6;
    const shiftAmount = shift * 0.4;

    const leftLevel = baseBrightness + shiftAmount * (1 - shift);
    const rightLevel = baseBrightness + shiftAmount * shift;

    const color = getCurrentColor(t);
    const leftHalf = Math.floor(cols / 2);

    return makeFrame(rows, cols, (x) => {
        const lvl = (x < leftHalf) ? leftLevel : rightLevel;
        if (lvl <= 0.001) return OFF;
        const r = (color[0] * lvl) | 0;
        const g = (color[1] * lvl) | 0;
        const b = (color[2] * lvl) | 0;
        return [r, g, b];
    });
};

// Chase Shift - smooth chase from left to right
const pEyeChaseShift = ({ rows, cols, t }: PatternContext) => {
    const hz = SHIFT_BASE_HZ * 1.2;
    const phase = (t * hz) % 1;

    // Create a traveling wave
    const leftLevel = Math.max(0.1, Math.cos(phase * TWO_PI));
    const rightLevel = Math.max(0.1, Math.sin(phase * TWO_PI));

    const color = getCurrentColor(t);
    const leftHalf = Math.floor(cols / 2);

    return makeFrame(rows, cols, (x) => {
        const lvl = (x < leftHalf) ? leftLevel : rightLevel;
        if (lvl <= 0.001) return OFF;
        const r = (color[0] * lvl) | 0;
        const g = (color[1] * lvl) | 0;
        const b = (color[2] * lvl) | 0;
        return [r, g, b];
    });
};

/* ===== Registry ===== */
export const PATTERNS: Record<PatternId, (c: PatternContext) => FrameRGB> = {
    "left-eye": pLeftEye,
    "right-eye": pRightEye,
    "full-color": pFullColor,
    "full-white": pFullWhite,
    "full-black": pFullBlack,
    "eye-shift": pEyeShift,
    "eye-wave-shift": pEyeWaveShift,
    "eye-bounce-shift": pEyeBounceShift,
    "eye-breathing-shift": pEyeBreathingShift,
    "eye-chase-shift": pEyeChaseShift,
};

export const ALL_PATTERN_IDS: PatternId[] = [
    "left-eye",
    "right-eye",
    "full-color",
    "full-white",
    "full-black",
    "eye-shift",
    "eye-wave-shift",
    "eye-bounce-shift",
    "eye-breathing-shift",
    "eye-chase-shift",
];

export const PATTERN_LABELS: Record<PatternId, string> = {
    "left-eye": "Left Eye",
    "right-eye": "Right Eye",
    "full-color": "Full Color",
    "full-white": "Full White",
    "full-black": "Full Black",
    "eye-shift": "Eye Shift",
    "eye-wave-shift": "Eye Wave Shift",
    "eye-bounce-shift": "Eye Bounce Shift",
    "eye-breathing-shift": "Eye Breathing Shift",
    "eye-chase-shift": "Eye Chase Shift",
};

export const renderPattern = (id: PatternId, ctx: PatternContext) => PATTERNS[id](ctx);

/* ===== Seeded RNG + auto chooser (updated with new patterns) ===== */
function mulberry32(seed: number) {
    let t = seed | 0;
    return () => {
        t |= 0; t = (t + 0x6D2B79F5) | 0;
        let r = Math.imul(t ^ (t >>> 15), 1 | t);
        r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
        return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
}
function pickWeighted<T>(rand: () => number, items: { v: T; w: number }[]): T {
    const total = items.reduce((s, i) => s + i.w, 0);
    const r = rand() * total;
    let acc = 0;
    for (const it of items) {
        acc += it.w;
        if (r <= acc) return it.v;
    }
    return items[items.length - 1].v;
}

export function choosePatternIdAuto(bass: number, energy: number, t: number): PatternId {
    const BUCKET = 0.6;
    const seed = Math.floor(t / BUCKET) ^ (Math.floor(bass) << 8) ^ (Math.floor(energy) << 16);
    const rnd = mulberry32(seed);

    const isKick = bass > 90;
    const isSpike = energy > 120;
    const isDrop = energy < 55;

    if (isKick) {
        return pickWeighted(rnd, [
            { v: "full-color" as const, w: 50 },
            { v: "eye-shift"  as const, w: 15 },
            // { v: "eye-wave-shift" as const, w: 10 },
            { v: "eye-bounce-shift" as const, w: 10 },
            // { v: "eye-chase-shift" as const, w: 8 },
            // { v: "left-eye"   as const, w: 3.5 },
            // { v: "right-eye"  as const, w: 3.5 },
        ]);
    }

    if (isSpike) {
        return pickWeighted(rnd, [
            { v: "full-color" as const, w: 55 },
            { v: "full-white" as const, w: 20 },
            { v: "eye-shift"  as const, w: 10 },
            // { v: "eye-wave-shift" as const, w: 8 },
            // { v: "eye-breathing-shift" as const, w: 7 },
        ]);
    }

    if (isDrop) return "full-white";

    const phase = Math.floor(t / 6) % 4;
    if (phase === 0) {
        return pickWeighted(rnd, [
            { v: "full-color" as const, w: 40 },
            { v: "full-white" as const, w: 15 },
            { v: "eye-shift"  as const, w: 12 },
            // { v: "eye-wave-shift" as const, w: 10 },
            { v: "eye-bounce-shift" as const, w: 8 },
            // { v: "eye-breathing-shift" as const, w: 8 },
            // { v: "eye-chase-shift" as const, w: 4 },
            // { v: "left-eye"   as const, w: 1.5 },
            // { v: "right-eye"  as const, w: 1.5 },
        ]);
    }

    return pickWeighted(rnd, [
        { v: "full-color" as const, w: 35 },
        { v: "full-white" as const, w: 18 },
        { v: "eye-shift"  as const, w: 15 },
        { v: "eye-wave-shift" as const, w: 12 },
        { v: "eye-bounce-shift" as const, w: 8 },
        { v: "eye-breathing-shift" as const, w: 7 },
        { v: "eye-chase-shift" as const, w: 3 },
        { v: "left-eye"   as const, w: 1 },
        { v: "right-eye"  as const, w: 1 },
    ]);
}