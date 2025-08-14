"use client";

import { useEffect, useRef, useState } from "react";
import { useBLE } from "@/hooks/useBLE";
import { useHasMounted } from "@/hooks/useHasMounted";
import { DeviceConnectButton } from "./DeviceConnectButton";
import { DeviceStatusIndicator } from "./DeviceStatusIndicator";
import ChromaPreview from "@/components/session/ChromaPreview";
import { usePlayer } from "@/context/PlayerProvider";
import {
    renderPattern,
    choosePatternIdAuto,
    ALL_PATTERN_IDS,
    PATTERN_LABELS,
    type PatternId,
} from "@/lib/ledPatterns";
import { useWakeLock } from "@/hooks/useWakeLock";

type PatternSelection = "auto" | PatternId;

export function DeviceControlPanel() {
    // keep screen on
    useWakeLock(true);

    const hasMounted = useHasMounted();
    const { isConnected, device, sendData, sendStrobe } = useBLE();

    // UI state
    const [selectedPattern, setSelectedPattern] = useState<PatternSelection>("auto");
    const [patternBrightness, setPatternBrightness] = useState<number>(0.3); // device-only dim
    const [currentStrobeHz, setCurrentStrobeHz] = useState<number>(20);

    // FFT bars for UI
    const [fftBars, setFftBars] = useState<Uint8Array | null>(null);

    // Player
    const { isPlaying, currentTime, analyser, ctx } = usePlayer();
    const timeRef = useRef(0);
    useEffect(() => { timeRef.current = currentTime || 0; }, [currentTime]);

    // RAF + guards
    const rafRef = useRef<number | null>(null);
    const lastStreamMsRef = useRef(0);
    const lastFFTUpdateMsRef = useRef(0);
    const lastSentStrobeRef = useRef(-1);

    // geometry + reusable buffers
    const rows = 2, cols = 8, ledCount = rows * cols;
    const rawFrameRef = useRef<Uint8Array>(new Uint8Array(ledCount * 3));   // preview (full brightness)
    const scaledFrameRef = useRef<Uint8Array>(new Uint8Array(ledCount * 3)); // device (scaled)
    const send2DRef = useRef<number[][]>(Array.from({ length: ledCount }, () => [0, 0, 0]));
    const binsRef = useRef<Uint8Array | null>(null);

    // ---------- AUTO switching (debounced + ref-committed) ----------
    const autoCommittedRef = useRef<PatternId>("shift"); // what we actually render each frame
    const [autoPatternId, setAutoPatternId] = useState<PatternId>("shift"); // mirror for UI/debug
    const lastChangeTimeRef = useRef(0); // seconds
    const lastCandidateRef = useRef<PatternId | null>(null);
    const candidateStableFramesRef = useRef(0);

    // knobs
    const REQUIRED_STABLE_FRAMES = 6;  // ~240ms at ~25fps
    const MIN_HOLD_SECONDS = 2.0;      // minimum time to hold a committed pattern
    const FORCE_SWITCH_AFTER = 8.0;    // force rotate if auto never changes

    // Seed AUTO when selected so it doesn’t feel stuck at "shift"
    useEffect(() => {
        if (selectedPattern === "auto" && analyser) {
            const t = timeRef.current;
            const binsSeed = new Uint8Array(analyser.frequencyBinCount);
            analyser.getByteFrequencyData(binsSeed);

            const n = binsSeed.length;
            const bEnd = Math.max(2, Math.floor(n * 0.12));
            let sumB = 0, sumAll = 0;
            for (let i = 0; i < bEnd; i++) sumB += binsSeed[i];
            for (let i = 0; i < n; i++)    sumAll += binsSeed[i];

            const bass = sumB / bEnd;
            const energy = sumAll / n;
            const cand = choosePatternIdAuto(bass, energy, t);

            autoCommittedRef.current = cand;
            setAutoPatternId(cand);
            lastCandidateRef.current = cand;
            candidateStableFramesRef.current = REQUIRED_STABLE_FRAMES;
            lastChangeTimeRef.current = ctx?.currentTime ?? t;
        }
    }, [selectedPattern, analyser, ctx]);

    useEffect(() => {
        // turn LEDs off when player not running
        if (!isPlaying) {
            const off = Array.from({ length: ledCount }, () => [0, 0, 0] as [number, number, number]);
            try { sendData(off); } catch {}
        }
        if (!isConnected || !isPlaying || !analyser) return;

        analyser.fftSize = 128; // match SessionPlayerUI

        // init FFT buffer once
        if (!binsRef.current || binsRef.current.length !== analyser.frequencyBinCount) {
            binsRef.current = new Uint8Array(analyser.frequencyBinCount);
        }

        // resume AudioContext if needed (mobile)
        if (ctx && ctx.state === "suspended") { ctx.resume().catch(() => {}); }

        const bins = binsRef.current!;
        const fftFpsMs = 100;   // ~10 fps for bars
        const streamFpsMs = 40; // ~25 fps for BLE friendliness

        const tick = () => {
            rafRef.current = requestAnimationFrame(tick);
            const now = performance.now();
            if (now - lastStreamMsRef.current < streamFpsMs) return;
            lastStreamMsRef.current = now;

            // FFT read (✅ just a plain Uint8Array)
            // analyser.getByteFrequencyData(bins);
            const bins = new Uint8Array(analyser.frequencyBinCount);
            analyser.getByteFrequencyData(bins);

            // bands
            const n = bins.length;
            const bEnd = Math.max(2, Math.floor(n * 0.12));
            const mEnd = Math.max(bEnd + 1, Math.floor(n * 0.45));
            let sumB = 0, sumM = 0, sumT = 0, sumAll = 0;
            for (let i = 0; i < bEnd; i++) sumB += bins[i];
            for (let i = bEnd; i < mEnd; i++) sumM += bins[i];
            for (let i = mEnd; i < n; i++) sumT += bins[i];
            for (let i = 0; i < n; i++)    sumAll += bins[i];

            const bass = sumB / bEnd;
            const mid = sumM / (mEnd - bEnd);
            const treble = sumT / (n - mEnd);
            const energy = sumAll / n;

            // strobe (manual only)
            const desiredHz = currentStrobeHz > 0 ? currentStrobeHz : 0;
            if (desiredHz !== lastSentStrobeRef.current) {
                lastSentStrobeRef.current = desiredHz;
                try { sendStrobe(desiredHz); } catch {}
            }

            // Decide final pattern
            const t = timeRef.current;
            let finalPatternId: PatternId;

            if (selectedPattern === "auto") {
                const candidate = choosePatternIdAuto(bass, energy, t);

                // debounce/hold logic
                if (candidate !== lastCandidateRef.current) {
                    lastCandidateRef.current = candidate;
                    candidateStableFramesRef.current = 1;
                } else {
                    candidateStableFramesRef.current++;
                }

                const nowSec = (ctx?.currentTime ?? t) || 0;
                const timeSinceChange = nowSec - lastChangeTimeRef.current;
                const canSwitch =
                    (candidateStableFramesRef.current >= REQUIRED_STABLE_FRAMES &&
                        timeSinceChange >= MIN_HOLD_SECONDS) ||
                    timeSinceChange >= FORCE_SWITCH_AFTER;

                if (candidate !== autoCommittedRef.current && canSwitch) {
                    autoCommittedRef.current = candidate; // commit immediately for render
                    setAutoPatternId(candidate);          // mirror to state for visibility
                    lastChangeTimeRef.current = nowSec;
                }

                finalPatternId = autoCommittedRef.current; // always render from committed ref
            } else {
                finalPatternId = selectedPattern;
            }

            // ---------- render ----------
            // raw (unscaled) for preview
            const raw = renderPattern(finalPatternId, { rows, cols, t, bass, mid, treble, energy });

            // copy into rawFrameRef (no allocation)
            const rawBuf = rawFrameRef.current;
            for (let i = 0; i < rawBuf.length; i++) rawBuf[i] = raw[i];

            // scale into device buffer
            const scaledBuf = scaledFrameRef.current;
            const scale = patternBrightness;
            if (scale <= 0) {
                scaledBuf.fill(0);
            } else if (scale >= 1) {
                // fast path
                for (let i = 0; i < scaledBuf.length; i++) scaledBuf[i] = rawBuf[i];
            } else {
                for (let i = 0; i < scaledBuf.length; i++) {
                    scaledBuf[i] = Math.round(rawBuf[i] * scale);
                }
            }

            // pack into reusable 2D for BLE
            const twoD = send2DRef.current;
            for (let i = 0, j = 0; i < ledCount; i++, j += 3) {
                const triplet = twoD[i];
                triplet[0] = scaledBuf[j];
                triplet[1] = scaledBuf[j + 1];
                triplet[2] = scaledBuf[j + 2];
            }

            // send to device
            try { sendData(twoD); } catch {}

            // throttled FFT UI update (preview uses rawFrameRef directly)
            if (now - lastFFTUpdateMsRef.current >= fftFpsMs) {
                lastFFTUpdateMsRef.current = now;
                setFftBars(new Uint8Array(bins));
            }
        };

        rafRef.current = requestAnimationFrame(tick);
        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
            lastSentStrobeRef.current = -1;
        };
    }, [
        isConnected,
        isPlaying,
        analyser,
        ctx,
        selectedPattern,
        patternBrightness,
        currentStrobeHz,
        sendData,
        sendStrobe,
    ]);

    if (!hasMounted) {
        return (
            <div className="bg-slate-50 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-slate-900 mb-4">Device Connection</h3>
                <div className="animate-pulse">
                    <div className="h-4 bg-slate-200 rounded mb-2"></div>
                    <div className="h-8 bg-slate-200 rounded"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-slate-50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Device Connection</h3>

            {/* Connection Status */}
            <div className="flex items-center gap-3 mb-4">
                <DeviceStatusIndicator />
                {device && <span className="text-xs text-slate-600">{device.name || "Unnamed Device"}</span>}
            </div>

            {/* Connection Controls */}
            <div className="mb-4">
                <DeviceConnectButton />
            </div>

            {/* LED Preview (full brightness; not scaled) */}
            {isConnected && (
                <div className="mb-4 pt-3 border-t border-slate-200">
                    <label className="block text-xs text-slate-600 mb-2">LED Pattern Preview</label>
                    <div className="flex justify-center">
                        <ChromaPreview
                            rows={2}
                            cols={8}
                            frame={new Uint8Array(rawFrameRef.current)}  // <-- unscaled preview
                            strobeHz={currentStrobeHz}
                            cellSize={20}
                            gap={4}
                            className="bg-slate-100 p-4 rounded-lg"
                        />
                    </div>
                </div>
            )}

            {/* Device Controls */}
            {isConnected && (
                <div className="space-y-3 pt-3 border-t border-slate-200">
                    <div>
                        <label className="block text-xs text-slate-600 mb-2">LED Pattern Control</label>

                        {/* Pattern Selection */}
                        <div className="mb-3">
                            <label className="block text-xs text-slate-600 mb-1">Pattern Type</label>
                            <select
                                value={selectedPattern}
                                onChange={(e) => setSelectedPattern(e.target.value as PatternSelection)}
                                className="w-full p-2 border border-slate-200 rounded text-xs"
                            >
                                <option value="auto">AUTO (beat)</option>
                                {ALL_PATTERN_IDS.map((id) => (
                                    <option key={id} value={id}>
                                        {PATTERN_LABELS[id] ?? id}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Brightness Control (device only; preview ignores) */}
                        <div className="mb-3">
                            <label className="block text-xs text-slate-600 mb-1">Brightness Level</label>
                            <input
                                type="range"
                                min="0"
                                max="100"
                                step="5"
                                value={patternBrightness * 100}
                                onChange={(e) => setPatternBrightness(Number(e.target.value) / 100)}
                                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                            />
                            <div className="flex justify-between text-xs text-slate-500 mt-1">
                                <span>0%</span>
                                <span>50%</span>
                                <span>100%</span>
                            </div>
                        </div>
                    </div>

                    {/* Strobe */}
                    <div>
                        <label className="block text-xs text-slate-600 mb-2">Strobe Frequency</label>
                        <div className="space-y-2">
                            <input
                                type="range"
                                min="0"
                                max="60"
                                step="1"
                                value={currentStrobeHz}
                                onChange={(e) => {
                                    const hz = Number(e.target.value);
                                    setCurrentStrobeHz(hz);
                                    if (hz > 0) { try { sendStrobe(hz); } catch {} }
                                }}
                                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-orange-500"
                            />
                            <div className="flex justify-between text-xs text-slate-500">
                                <span>0 Hz</span>
                                <span className="font-mono">{currentStrobeHz} Hz</span>
                                <span>60 Hz</span>
                            </div>
                        </div>
                    </div>

                    {/* Live FFT bars */}
                    {fftBars && (
                        <div className="mt-3 pt-3 border-t border-slate-200">
                            <label className="block text-xs text-slate-600 mb-2">Live FFT</label>
                            <div className="flex gap-[2px] items-end h-24 bg-slate-200 p-1 rounded">
                                {Array.from(fftBars).map((v, i) => (
                                    <div
                                        key={i}
                                        style={{ height: `${(v / 255) * 100}%`, width: `${100 / fftBars.length}%` }}
                                        className="bg-blue-500 rounded-sm"
                                        title={`${i}: ${v}`}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Status */}
                    <div className="mt-3 pt-3 border-t border-slate-200">
                        <div className="text-xs text-slate-500 text-center">
                            {isPlaying ? (
                                <div className="text-green-600">
                                    🎵 Synced with main player • Pattern:{" "}
                                    {selectedPattern === "auto" ? `AUTO (${autoPatternId})` : (PATTERN_LABELS[selectedPattern] ?? selectedPattern)}
                                </div>
                            ) : (
                                <div className="text-slate-400">⏸️ Waiting for main player to start</div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
