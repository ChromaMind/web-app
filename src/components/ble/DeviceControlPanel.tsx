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

type PatternSelection = "auto" | PatternId;

export function DeviceControlPanel() {
    const hasMounted = useHasMounted();
    const { isConnected, device, sendData, sendStrobe } = useBLE();

    // UI state (kept)
    const [selectedPattern, setSelectedPattern] = useState<PatternSelection>("shift");
    const [patternBrightness, setPatternBrightness] = useState<number>(0.8);
    const [currentStrobeHz, setCurrentStrobeHz] = useState<number>(20);

    // Preview state (UI only; throttle updates)
    const [currentPattern, setCurrentPattern] = useState<number[][]>(
        Array(16).fill([0, 0, 0])
    );
    const [fftBars, setFftBars] = useState<Uint8Array | null>(null);

    // Player (mirror currentTime to a ref so effect deps don't churn)
    const { isPlaying, currentTime, analyser, ctx } = usePlayer();
    const timeRef = useRef(0);
    useEffect(() => {
        timeRef.current = currentTime || 0;
    }, [currentTime]);

    // RAF + guards
    const rafRef = useRef<number | null>(null);
    const lastFrameMsRef = useRef(0);
    const lastUIUpdateMsRef = useRef(0);
    const lastFFTUpdateMsRef = useRef(0);
    const lastSentStrobeRef = useRef(-1);

    // geometry + reusable buffers
    const rows = 2, cols = 8, ledCount = rows * cols;
    const outFrameRef = useRef<Uint8Array>(new Uint8Array(ledCount * 3));
    const send2DRef = useRef<number[][]>(Array.from({ length: ledCount }, () => [0, 0, 0]));
    const binsRef = useRef<Uint8Array | null>(null);

    useEffect(() => {
        if (!isPlaying){
            const off = Array.from({ length: ledCount }, () => [0, 0, 0] as [number, number, number]);
            void sendData(off);
        }
        if (!isConnected || !isPlaying || !analyser) return;

        // init FFT buffer once
        if (!binsRef.current || binsRef.current.length !== analyser.frequencyBinCount) {
            binsRef.current = new Uint8Array(analyser.frequencyBinCount);
        }

        // resume AudioContext if needed
        if (ctx && ctx.state === "suspended") {
            ctx.resume().catch(() => {});
        }

        const bins = binsRef.current!;
        const uiFpsMs = 66;   // ~15 fps for UI preview
        const fftFpsMs = 100; // ~10 fps for bars
        const streamFpsMs = 33; // ~30 fps for BLE/device

        const tick = () => {
            rafRef.current = requestAnimationFrame(tick);
            const now = performance.now();

            // stream at ~30fps
            if (now - lastFrameMsRef.current < streamFpsMs) return;
            lastFrameMsRef.current = now;

            // ---- FFT read
            // analyser.getByteFrequencyData(bins);

            // bands
            const n = bins.length;
            const bEnd = Math.max(2, Math.floor(n * 0.12));
            const mEnd = Math.max(bEnd + 1, Math.floor(n * 0.45));
            let sumB = 0, sumM = 0, sumT = 0, sumAll = 0;
            for (let i = 0; i < bEnd; i++) sumB += bins[i];
            for (let i = bEnd; i < mEnd; i++) sumM += bins[i];
            for (let i = mEnd; i < n; i++) sumT += bins[i];
            for (let i = 0; i < n; i++) sumAll += bins[i];

            const bass = sumB / bEnd;
            const mid = sumM / (mEnd - bEnd);
            const treble = sumT / (n - mEnd);
            const energy = sumAll / n;

            // strobe (manual only)
            const desiredHz = currentStrobeHz > 0 ? currentStrobeHz : 0;
            if (desiredHz !== lastSentStrobeRef.current) {
                lastSentStrobeRef.current = desiredHz;
                // fire-and-forget
                try { sendStrobe(desiredHz); } catch {}
            }

            // choose pattern (no fades)
            const t = timeRef.current;
            const patternId: PatternId =
                selectedPattern === "auto" ? choosePatternIdAuto(bass, energy, t) : selectedPattern;

            // render (into outFrameRef) and scale
            const out = outFrameRef.current;
            const raw = renderPattern(patternId, { rows, cols, t, bass, mid, treble, energy });
            // scale in-place to avoid another buffer
            for (let i = 0; i < out.length; i++) {
                out[i] = Math.round(raw[i] * patternBrightness);
            }

            // convert to reusable 2D buffer (no new arrays)
            const twoD = send2DRef.current;
            for (let i = 0, j = 0; i < ledCount; i++, j += 3) {
                const triplet = twoD[i];
                triplet[0] = out[j];
                triplet[1] = out[j + 1];
                triplet[2] = out[j + 2];
            }

            // send to device
            try { sendData(twoD); } catch {}

            // throttle React state updates for smooth UI
            if (now - lastUIUpdateMsRef.current >= uiFpsMs) {
                lastUIUpdateMsRef.current = now;
                // shallow-copy for React state (keeps same inner arrays to avoid churn)
                setCurrentPattern(twoD);
            }
            if (now - lastFFTUpdateMsRef.current >= fftFpsMs) {
                lastFFTUpdateMsRef.current = now;
                setFftBars(prev => {
                    // reuse length; create a new Uint8Array only when necessary
                    return new Uint8Array(bins);
                });
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
        selectedPattern,        // keep settings deps
        patternBrightness,
        currentStrobeHz,
        sendData,
        sendStrobe,
    ]); // ⚠️ no currentTime here

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
                {device && (
                    <span className="text-xs text-slate-600">
            {device.name || "Unnamed Device"}
          </span>
                )}
            </div>

            {/* Connection Controls */}
            <div className="mb-4">
                <DeviceConnectButton />
            </div>

            {/* LED Preview - Show when connected */}
            {isConnected && (
                <div className="mb-4 pt-3 border-t border-slate-200">
                    <label className="block text-xs text-slate-600 mb-2">LED Pattern Preview</label>
                    <div className="flex justify-center">
                        <ChromaPreview
                            rows={2}
                            cols={8}
                            // build once; we already reuse inner arrays; Preview wants a flat Uint8Array
                            frame={new Uint8Array(outFrameRef.current)}
                            strobeHz={currentStrobeHz}
                            cellSize={20}
                            gap={4}
                            className="bg-slate-100 p-4 rounded-lg"
                        />
                    </div>
                </div>
            )}

            {/* Device Controls - Only show when connected */}
            {isConnected && (
                <div className="space-y-3 pt-3 border-t border-slate-200">
                    <div>
                        <label className="block text-xs text-slate-600 mb-2">LED Pattern Control</label>

                        {/* Pattern Selection (added AUTO option, same styling) */}
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

                        {/* Brightness Control (same UI) */}
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

                    {/* Live FFT bars (same look; UI-throttled) */}
                    {fftBars && (
                        <div className="mt-3 pt-3 border-t border-slate-200">
                            <label className="block text-xs text-slate-600 mb-2">Live FFT</label>
                            <div className="flex gap-[2px] items-end h-24 bg-slate-200 p-1 rounded">
                                {Array.from(fftBars).map((v, i) => (
                                    <div
                                        key={i}
                                        style={{
                                            height: `${(v / 255) * 100}%`,
                                            width: `${100 / fftBars.length}%`,
                                        }}
                                        className="bg-blue-500 rounded-sm"
                                        title={`${i}: ${v}`}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Status Info */}
                    <div className="mt-3 pt-3 border-t border-slate-200">
                        <div className="text-xs text-slate-500 text-center">
                            {isPlaying ? (
                                <div className="text-green-600">
                                    🎵 Synced with main player • Pattern:{" "}
                                    {selectedPattern === "auto"
                                        ? "AUTO"
                                        : (PATTERN_LABELS[selectedPattern] ?? selectedPattern)}
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
