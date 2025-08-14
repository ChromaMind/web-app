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

    // ========== ENHANCED BEAT DETECTION ==========

    // Beat tracking history
    const bassHistoryRef = useRef<number[]>([]);
    const energyHistoryRef = useRef<number[]>([]);
    const trebleHistoryRef = useRef<number[]>([]);
    const HISTORY_LENGTH = 8; // frames to track

    // Beat detection thresholds
    const lastBeatTimeRef = useRef(0);
    const lastEnergySpikeRef = useRef(0);
    const lastFreqChangeRef = useRef(0);

    // Pattern forcing for beat events
    const forcedPatternRef = useRef<PatternId | null>(null);
    const forcedPatternEndRef = useRef(0);

    // ---------- AUTO switching (enhanced beat-reactive) ----------
    const autoCommittedRef = useRef<PatternId>("shift"); // what we actually render each frame
    const [autoPatternId, setAutoPatternId] = useState<PatternId>("shift"); // mirror for UI/debug
    const lastChangeTimeRef = useRef(0); // seconds
    const lastCandidateRef = useRef<PatternId | null>(null);
    const candidateStableFramesRef = useRef(0);

    // Beat-reactive knobs
    const REQUIRED_STABLE_FRAMES = 3;  // Faster switching for beats
    const MIN_HOLD_SECONDS = 0.8;      // Shorter hold for beat reactivity
    const FORCE_SWITCH_AFTER = 4.0;    // Faster rotation
    const BEAT_FORCE_DURATION = 1.5;   // How long to force pattern after beat event

    // Beat detection function
    const detectBeatEvents = (bass: number, energy: number, treble: number, t: number) => {
        const now = t;

        // Add to history
        bassHistoryRef.current.push(bass);
        energyHistoryRef.current.push(energy);
        trebleHistoryRef.current.push(treble);

        if (bassHistoryRef.current.length > HISTORY_LENGTH) {
            bassHistoryRef.current.shift();
            energyHistoryRef.current.shift();
            trebleHistoryRef.current.shift();
        }

        if (bassHistoryRef.current.length < 4) return; // Need some history

        const bassAvg = bassHistoryRef.current.reduce((a, b) => a + b, 0) / bassHistoryRef.current.length;
        const energyAvg = energyHistoryRef.current.reduce((a, b) => a + b, 0) / energyHistoryRef.current.length;
        const trebleAvg = trebleHistoryRef.current.reduce((a, b) => a + b, 0) / trebleHistoryRef.current.length;

        // 1. BASS DROP/KICK DETECTION
        const bassThreshold = bassAvg * 1.4; // 40% above average
        if (bass > bassThreshold && bass > 100 && (now - lastBeatTimeRef.current) > 0.3) {
            console.log("🥁 BASS KICK detected!", bass, "vs avg", bassAvg);
            lastBeatTimeRef.current = now;
            forcedPatternRef.current = Math.random() > 0.5 ? "bottom" : "top-bottom";
            forcedPatternEndRef.current = now + BEAT_FORCE_DURATION;
            return true;
        }

        // 2. ENERGY SPIKE DETECTION
        const energyThreshold = energyAvg * 1.6; // 60% above average
        if (energy > energyThreshold && energy > 120 && (now - lastEnergySpikeRef.current) > 0.5) {
            console.log("⚡ ENERGY SPIKE detected!", energy, "vs avg", energyAvg);
            lastEnergySpikeRef.current = now;
            forcedPatternRef.current = "sparkle";
            forcedPatternEndRef.current = now + BEAT_FORCE_DURATION;
            return true;
        }

        // 3. TREBLE/HI-HAT PATTERN DETECTION
        const trebleThreshold = trebleAvg * 1.5; // 50% above average
        if (treble > trebleThreshold && treble > 80 && (now - lastFreqChangeRef.current) > 0.4) {
            console.log("🎵 TREBLE CHANGE detected!", treble, "vs avg", trebleAvg);
            lastFreqChangeRef.current = now;
            forcedPatternRef.current = Math.random() > 0.5 ? "top" : "shift";
            forcedPatternEndRef.current = now + BEAT_FORCE_DURATION * 0.8; // Shorter for treble
            return true;
        }

        // 4. SUDDEN DROP/SILENCE DETECTION
        if (energy < energyAvg * 0.4 && energyAvg > 100 && (now - lastEnergySpikeRef.current) > 1.0) {
            console.log("🔇 ENERGY DROP detected!", energy, "vs avg", energyAvg);
            lastEnergySpikeRef.current = now;
            forcedPatternRef.current = "white";
            forcedPatternEndRef.current = now + BEAT_FORCE_DURATION * 0.5;
            return true;
        }

        return false;
    };

    // Enhanced pattern selection with beat detection
    const selectPatternWithBeats = (bass: number, energy: number, treble: number, mid: number, t: number): PatternId => {
        // Check if we're in a forced pattern period
        if (forcedPatternRef.current && t < forcedPatternEndRef.current) {
            return forcedPatternRef.current;
        }

        // Clear forced pattern if expired
        if (t >= forcedPatternEndRef.current) {
            forcedPatternRef.current = null;
        }

        // Detect beat events (will set forcedPattern if detected)
        detectBeatEvents(bass, energy, treble, t);

        // If beat event just triggered, use forced pattern
        if (forcedPatternRef.current && t < forcedPatternEndRef.current) {
            return forcedPatternRef.current;
        }

        // Otherwise use enhanced auto logic with natural flow
        // Use weighted probabilities instead of hard thresholds for natural feel

        const bassWeight = Math.min(bass / 255, 1.0);
        const energyWeight = Math.min(energy / 255, 1.0);
        const trebleWeight = Math.min(treble / 255, 1.0);
        const midWeight = Math.min(mid / 255, 1.0);

        // Create probability pools based on audio characteristics
        const patterns: { pattern: PatternId, weight: number }[] = [];

        // Base cycling patterns (always have some weight for variety)
        patterns.push(
            { pattern: "arrow", weight: 0.3 + midWeight * 0.4 },
            { pattern: "double-arrow", weight: 0.25 + energyWeight * 0.3 },
            { pattern: "shift", weight: 0.4 + midWeight * 0.3 },
            { pattern: "inward", weight: 0.2 + bassWeight * 0.4 }
        );

        // Audio-reactive patterns with soft weights
        if (bassWeight > 0.3) {
            patterns.push({ pattern: "bottom", weight: bassWeight * 0.8 });
            patterns.push({ pattern: "top-bottom", weight: bassWeight * 0.6 });
        }

        if (trebleWeight > 0.25) {
            patterns.push({ pattern: "top", weight: trebleWeight * 0.7 });
        }

        if (energyWeight > 0.4) {
            patterns.push({ pattern: "sparkle", weight: energyWeight * 0.5 });
        }

        // Low energy bias toward calmer patterns
        if (energyWeight < 0.3) {
            patterns.push({ pattern: "white", weight: (1 - energyWeight) * 0.4 });
        }

        // Add time-based variety (slow drift)
        const timePhase = (Math.sin(t * 0.3) + 1) / 2; // 0-1 sine wave
        patterns.forEach(p => {
            if (["arrow", "double-arrow"].includes(p.pattern)) {
                p.weight += timePhase * 0.2; // Boost arrows during one phase
            } else if (["shift", "sparkle"].includes(p.pattern)) {
                p.weight += (1 - timePhase) * 0.2; // Boost these during opposite phase
            }
        });

        // Weighted random selection
        const totalWeight = patterns.reduce((sum, p) => sum + p.weight, 0);
        let random = Math.random() * totalWeight;

        for (const p of patterns) {
            random -= p.weight;
            if (random <= 0) {
                return p.pattern;
            }
        }

        // Fallback (should rarely happen)
        return "shift";
    };

    // Seed AUTO when selected so it doesn't feel stuck at "shift"
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
            const cand = selectPatternWithBeats(bass, energy, 0, 0, t);

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

        // Enhanced FFT size for better beat detection
        analyser.fftSize = 256; // Increased from 128 for better resolution
        analyser.minDecibels = -90;
        analyser.maxDecibels = -10;
        analyser.smoothingTimeConstant = 0.5; // More responsive

        // init FFT buffer once
        if (!binsRef.current || binsRef.current.length !== analyser.frequencyBinCount) {
            binsRef.current = new Uint8Array(analyser.frequencyBinCount);
        }

        // resume AudioContext if needed (mobile)
        if (ctx && ctx.state === "suspended") { ctx.resume().catch(() => {}); }

        const bins = binsRef.current!;
        const fftFpsMs = 80;   // Faster updates for beat detection
        const streamFpsMs = 35; // Slightly faster for better beat response

        const tick = () => {
            rafRef.current = requestAnimationFrame(tick);
            const now = performance.now();
            if (now - lastStreamMsRef.current < streamFpsMs) return;
            lastStreamMsRef.current = now;

            // FFT read
            const bins = new Uint8Array(analyser.frequencyBinCount);
            analyser.getByteFrequencyData(bins);

            // Enhanced frequency analysis for beat detection
            const n = bins.length;
            const bEnd = Math.max(2, Math.floor(n * 0.15)); // Wider bass range
            const mEnd = Math.max(bEnd + 1, Math.floor(n * 0.45));
            let sumB = 0, sumM = 0, sumT = 0, sumAll = 0;
            for (let i = 0; i < bEnd; i++) sumB += bins[i];
            for (let i = bEnd; i < mEnd; i++) sumM += bins[i];
            for (let i = mEnd; i < n; i++) sumT += bins[i];
            for (let i = 0; i < n; i++)    sumAll += bins[i];

            // Enhanced sensitivity for beat detection
            const bass = (sumB / bEnd) * 1.3;
            const mid = (sumM / (mEnd - bEnd)) * 1.1;
            const treble = (sumT / (n - mEnd)) * 1.2;
            const energy = (sumAll / n) * 1.2;

            // strobe (manual only)
            const desiredHz = currentStrobeHz > 0 ? currentStrobeHz : 0;
            if (desiredHz !== lastSentStrobeRef.current) {
                lastSentStrobeRef.current = desiredHz;
                try { sendStrobe(desiredHz); } catch {}
            }

            // Decide final pattern with beat detection
            const t = timeRef.current;
            let finalPatternId: PatternId;

            if (selectedPattern === "auto") {
                const candidate = selectPatternWithBeats(bass, energy, treble, mid, t);

                // Much faster debouncing for beat reactivity
                if (candidate !== lastCandidateRef.current) {
                    lastCandidateRef.current = candidate;
                    candidateStableFramesRef.current = 1;
                } else {
                    candidateStableFramesRef.current++;
                }

                const nowSec = (ctx?.currentTime ?? t) || 0;
                const timeSinceChange = nowSec - lastChangeTimeRef.current;

                // More aggressive switching for beat events
                const canSwitch =
                    (candidateStableFramesRef.current >= REQUIRED_STABLE_FRAMES &&
                        timeSinceChange >= MIN_HOLD_SECONDS) ||
                    timeSinceChange >= FORCE_SWITCH_AFTER ||
                    (forcedPatternRef.current && candidate === forcedPatternRef.current); // Immediate switch for beat events

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
                                <option value="auto">AUTO (beat-reactive)</option>
                                {ALL_PATTERN_IDS.map((id) => (
                                    <option key={id} value={id}>
                                        {PATTERN_LABELS[id] ?? id}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Beat Detection Status */}
                        {selectedPattern === "auto" && (
                            <div className="mb-3 p-2 bg-slate-100 rounded text-xs">
                                <div className="text-slate-600 mb-1">🎵 Beat Detection Active</div>
                                <div className="text-slate-500">
                                    Listening for: Bass kicks • Energy spikes • Treble changes • Drops
                                </div>
                            </div>
                        )}

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

                    {/* Enhanced FFT bars with beat detection visualization */}
                    {fftBars && (
                        <div className="mt-3 pt-3 border-t border-slate-200">
                            <label className="block text-xs text-slate-600 mb-2">Live FFT (Beat Detection)</label>
                            <div className="flex gap-[1px] items-end h-32 bg-slate-900 p-2 rounded-lg">
                                {Array.from(fftBars).map((v, i) => {
                                    const heightPercent = Math.max(2, (v / 255) * 100);
                                    // Enhanced color coding for beat detection
                                    let colorClass = "bg-blue-400";
                                    if (i < fftBars.length * 0.15) {
                                        // Bass range - red with beat indicator
                                        colorClass = v > 150 ? "bg-red-600 animate-pulse" : "bg-red-500";
                                    } else if (i < fftBars.length * 0.45) {
                                        // Mid range - green
                                        colorClass = v > 120 ? "bg-green-600" : "bg-green-500";
                                    } else {
                                        // Treble range - cyan with activity indicator
                                        colorClass = v > 100 ? "bg-cyan-300 animate-pulse" : "bg-cyan-400";
                                    }

                                    return (
                                        <div
                                            key={i}
                                            style={{
                                                height: `${heightPercent}%`,
                                                width: `${100 / fftBars.length}%`,
                                                opacity: v > 5 ? 1 : 0.3
                                            }}
                                            className={`${colorClass} rounded-sm transition-all duration-100`}
                                            title={`${i}: ${v} (${Math.round(heightPercent)}%)`}
                                        />
                                    );
                                })}
                            </div>
                            <div className="text-xs text-slate-500 mt-1 text-center">
                                <span className="text-red-500">●</span> Bass (kicks) •
                                <span className="text-green-500">●</span> Mid •
                                <span className="text-cyan-400">●</span> Treble (hi-hats)
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
                                    {forcedPatternRef.current && selectedPattern === "auto" && (
                                        <span className="text-orange-500 font-semibold"> • 🎵 BEAT EVENT!</span>
                                    )}
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