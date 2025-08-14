// components/session/SessionPlayerUI.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import type { SessionDetails } from "@/services/nftService";
import ChromaPreview, { type LedRGBFrame } from "@/components/session/ChromaPreview";
import { useBLE } from "@/hooks/useBLE";
import { useWakeLock } from "@/hooks/useWakeLock";
import {
  renderPattern,
  choosePatternIdAuto,
  ALL_PATTERN_IDS,
  PATTERN_LABELS,
  type PatternId,
} from "@/lib/ledPatterns";

type PlayerEngine = any;

interface Props {
  session: SessionDetails;
  player: PlayerEngine;
  isDeviceConnected?: boolean;
}

const fmt = (s: number) =>
    `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, "0")}`;

type StrobeMode = "off" | "auto" | "manual";

export function SessionPlayerUI({ session }: Props) {
  // Keep the screen awake (helps JS run on mobile)
  const [keepAwake, setKeepAwake] = useState(true);
  useWakeLock(keepAwake);

  // BLE
  const { sendData, sendStrobe, isConnected } = useBLE();

  // Audio + analyser
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);

  // UI state
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const seeking = useRef(false);

  // Matrix size — ✅ 2 rows × 8 columns (16 LEDs total)
  const rows = 2;
  const cols = 8;
  const ledCount = rows * cols;

  // Preview frame (always full brightness on-screen)
  const [frame, setFrame] = useState<LedRGBFrame>(new Uint8Array(ledCount * 3));

  // BLE brightness (device-only dim)
  const [bleBrightness, setBleBrightness] = useState(0.3);
  const bleBrightnessRef = useRef(bleBrightness);
  useEffect(() => {
    bleBrightnessRef.current = bleBrightness;
  }, [bleBrightness]);

  // Pattern mode: "auto" or a specific PatternId
  const [mode, setMode] = useState<"auto" | PatternId>("auto");
  const modeRef = useRef<"auto" | PatternId>(mode);
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  const [patternLabel, setPatternLabel] = useState<string>("AUTO");
  const currentPatternRef = useRef<PatternId>("shift");

  // STROBE: Off / Auto / Manual
  const [strobeMode, setStrobeMode] = useState<StrobeMode>("off");
  const strobeModeRef = useRef<StrobeMode>(strobeMode);
  useEffect(() => {
    strobeModeRef.current = strobeMode;
    // stop immediately if turned off
    if (strobeMode === "off" && isConnected) void sendStrobe(0);
  }, [strobeMode, isConnected, sendStrobe]);

  const [manualHz, setManualHz] = useState<number>(8);
  const manualHzRef = useRef(manualHz);
  useEffect(() => {
    manualHzRef.current = manualHz;
  }, [manualHz]);

  // preview strobe (capped to ~30Hz for the display)
  const [previewStrobeHz, setPreviewStrobeHz] = useState<number>(0);

  // remember brightness before pause/end so we can restore on play
  const [lastBrightness, setLastBrightness] = useState<number>(0);

  // Bind audio element events
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;

    const onLoaded = () => setDuration(a.duration || 0);
    const onTime = () => {
      if (!seeking.current) setCurrent(a.currentTime || 0);
    };
    const onPlay = () => {
      setPlaying(true);
      setBleBrightness(lastBrightness);
    };
    const onPause = () => {
      setLastBrightness(bleBrightness);
      setPlaying(false);
      setBleBrightness(0);
      // send one black frame immediately
      if (isConnected) {
        const off = Array.from({ length: ledCount }, () => [0, 0, 0] as [number, number, number]);
        void sendData(off);
        void sendStrobe(0);
      }
    };
    const onEnded = () => {
      setLastBrightness(bleBrightness);
      setPlaying(false);
      setCurrent(0);
      setBleBrightness(0);
      // turn device off at end
      if (isConnected) {
        const off = Array.from({ length: ledCount }, () => [0, 0, 0] as [number, number, number]);
        void sendData(off);
        void sendStrobe(0);
      }
    };

    a.addEventListener("loadedmetadata", onLoaded);
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);
    a.addEventListener("ended", onEnded);
    return () => {
      a.removeEventListener("loadedmetadata", onLoaded);
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
      a.removeEventListener("ended", onEnded);
    };
  }, [bleBrightness, isConnected, ledCount, sendData, sendStrobe, lastBrightness]);

  // Create analyser + RAF loop once (on first play)
  const setupAnalyserIfNeeded = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
    if (analyserRef.current) return; // already wired

    const ctx = audioCtxRef.current;
    const src = ctx.createMediaElementSource(audio);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 128; // decent resolution for 16 LEDs
    src.connect(analyser);
    analyser.connect(ctx.destination);
    analyserRef.current = analyser;

    const bins = new Uint8Array(analyser.frequencyBinCount);
    let lastFrameMs = 0;
    let lastSendMs = 0;
    let lastStrobeUpdateMs = 0;
    let lastSentHz = -1; // cache to avoid spamming same value

    const loop = () => {
      rafRef.current = requestAnimationFrame(loop);

      const now = performance.now();
      if (now - lastFrameMs < 33) return; // ~30 fps throttle
      lastFrameMs = now;

      analyser.getByteFrequencyData(bins);

      // Compute bands
      const n = bins.length;
      const bEnd = Math.max(2, Math.floor(n * 0.12));
      const mEnd = Math.max(bEnd + 1, Math.floor(n * 0.45));

      let sumB = 0, sumM = 0, sumT = 0;
      for (let i = 0; i < bEnd; i++) sumB += bins[i];
      for (let i = bEnd; i < mEnd; i++) sumM += bins[i];
      for (let i = mEnd; i < n; i++) sumT += bins[i];

      const bass = sumB / bEnd; // 0..255
      const mid = sumM / (mEnd - bEnd);
      const treble = sumT / (n - mEnd);
      let energy = 0;
      for (let i = 0; i < n; i++) energy += bins[i];
      energy /= n;

      const a = audioRef.current!;
      const t = a.currentTime || 0;

      // Decide pattern
      let patternId: PatternId;
      const modeNow = modeRef.current;
      if (modeNow === "auto") {
        patternId = choosePatternIdAuto(bass, energy, t);
        if (currentPatternRef.current !== patternId) {
          currentPatternRef.current = patternId;
          setPatternLabel("AUTO");
        }
    } else {
        patternId = modeNow;
        if (currentPatternRef.current !== patternId) {
          currentPatternRef.current = patternId;
          setPatternLabel(PATTERN_LABELS[patternId] ?? patternId);
        }
      }

      // Render a frame for the selected pattern
      const patFrame = renderPattern(patternId, {
        rows, cols, t, bass, mid, treble, energy,
      });

      // Update preview (full brightness)
      setFrame(patFrame);

      // ---- STROBE CONTROL (device 0..100 Hz) + PREVIEW (cap ~30 Hz) ----
      const strobeModeNow = strobeModeRef.current;
      let desiredHz = 0;

      if (strobeModeNow === "auto") {
        // Map energy → 0..100 Hz
        const targetHz = Math.max(0, Math.min(100, (energy / 255) * 100));
        // smooth a bit & quantize to 0.5 Hz to reduce BLE spam
        desiredHz = Math.round(targetHz * 2) / 2;
        if (isConnected && (now - lastStrobeUpdateMs > 120) && desiredHz !== lastSentHz) {
          void sendStrobe(desiredHz);
          lastSentHz = desiredHz;
          lastStrobeUpdateMs = now;
        }
      } else if (strobeModeNow === "manual") {
        desiredHz = Math.max(0, Math.min(100, manualHzRef.current));
        if (isConnected && desiredHz !== lastSentHz) {
          void sendStrobe(desiredHz);
          lastSentHz = desiredHz;
          lastStrobeUpdateMs = now;
        }
      } else {
        desiredHz = 0;
        if (isConnected && lastSentHz !== 0) {
          void sendStrobe(0);
          lastSentHz = 0;
          lastStrobeUpdateMs = now;
        }
      }

      // preview can't show > ~30 Hz on a 60 Hz display; cap for UI only
      const previewHz = Math.min(30, desiredHz);
      setPreviewStrobeHz(previewHz);

      // Send to device (dimmed) ~30 fps
      if (isConnected && now - lastSendMs >= 33) {
        const dim = bleBrightnessRef.current;
        const scaled: number[][] = new Array(ledCount);
        if (dim <= 0) {
          for (let i = 0; i < ledCount; i++) scaled[i] = [0, 0, 0];
        } else {
          for (let i = 0; i < ledCount; i++) {
            const base = i * 3;
            scaled[i] = [
              (patFrame[base] * dim) | 0,
              (patFrame[base + 1] * dim) | 0,
              (patFrame[base + 2] * dim) | 0,
            ];
          }
        }
        void sendData(scaled);
        lastSendMs = now;
      }
    };

    rafRef.current = requestAnimationFrame(loop);
  };

  // Play/pause with AudioContext resume
  const togglePlay = async () => {
    const a = audioRef.current;
    if (!a) return;

    if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
    if (audioCtxRef.current.state === "suspended") await audioCtxRef.current.resume();

    setupAnalyserIfNeeded();

    if (a.paused) a.play().catch((e) => console.error("play failed:", e));
    else a.pause();
  };

  // Seek handlers (avoid fighting timeupdate while dragging)
  const onSeekStart = () => { seeking.current = true; };
  const onSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrent(Number(e.target.value));
  };
  const onSeekEnd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const a = audioRef.current;
    if (!a) return;
    const t = Number(e.target.value);
    a.currentTime = t;
    setCurrent(t);
    seeking.current = false;
  };

  // Cleanup
  useEffect(() => {
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, []);

  const progress = duration ? (current / duration) * 100 : 0;

  return (
      <div className="max-w-md mx-auto rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
        <audio ref={audioRef} src={session.audioUrl ?? "/audios/rave.mp3"} preload="auto" />

        <div className="relative z-20 p-6 sm:p-8 space-y-4">
          <div className="text-center">
            <h2 className="text-2xl font-bold">{session.name ?? "Rave Session"}</h2>
            <p className="text-gray-600">
              LED Music Visualizer — <span className="font-mono text-xs">{patternLabel}</span>
            </p>
      </div>

          {/* Play + Seek */}
          <div className="flex items-center gap-3">
            <button
                onClick={togglePlay}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-full w-14 h-14 flex items-center justify-center text-2xl shadow"
                aria-label={playing ? "Pause" : "Play"}
            >
              {playing ? "❚❚" : "▶"}
            </button>

            <div className="flex-1">
              <div className="flex justify-between text-xs text-slate-600">
                <span>{fmt(current)}</span>
                <span>{fmt(duration)}</span>
              </div>
              <div className="mt-1 relative">
                <div className="h-2 bg-gray-200 rounded-full">
                  <div
                      className="h-2 bg-blue-600 rounded-full transition-[width] duration-100"
                      style={{ width: `${progress}%` }}
                  />
                </div>
                <input
                    type="range"
                    min={0}
                    max={duration || 0}
                    step={0.1}
                    value={current}
                    onMouseDown={onSeekStart}
                    onTouchStart={onSeekStart}
                    onChange={onSeekChange}
                    onMouseUp={(e: any) => onSeekEnd(e)}
                    onTouchEnd={(e: any) => onSeekEnd(e)}
                    className="absolute top-0 w-full h-2 opacity-0 cursor-pointer"
                    aria-label="Seek"
                />
              </div>
            </div>
        </div>
        
          {/* Pattern selector + Brightness */}
          <div className="flex items-center gap-3">
            <label className="text-sm text-slate-600">Pattern</label>
            <select
                value={mode}
                onChange={(e) => setMode(e.target.value as "auto" | PatternId)}
                className="border rounded-md px-2 py-1 text-sm"
            >
              <option value="auto">AUTO (beat)</option>
              {ALL_PATTERN_IDS.map((id) => (
                  <option key={id} value={id}>
                    {PATTERN_LABELS[id] ?? id}
                  </option>
              ))}
            </select>

            <div className="ml-auto w-48">
              <label className="block text-xs text-gray-600 mb-1">
                Device Brightness: {(bleBrightness * 100).toFixed(0)}%
              </label>
              <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={bleBrightness}
                  onChange={(e) => setBleBrightness(Number(e.target.value))}
                  className="w-full"
              />
            </div>
        </div>

          {/* STROBE controls */}
          <div className="rounded-lg border p-3 space-y-2">
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-600">Strobe</span>
              <select
                  value={strobeMode}
                  onChange={(e) => setStrobeMode(e.target.value as StrobeMode)}
                  className="border rounded-md px-2 py-1 text-sm"
              >
                <option value="off">Off</option>
                <option value="auto">Auto (beat)</option>
                <option value="manual">Manual</option>
              </select>

              {strobeMode === "manual" && (
                  <div className="ml-auto w-56">
                    <label className="block text-xs text-gray-600 mb-1">
                      Strobe Hz: {manualHz.toFixed(1)}
                    </label>
                    <input
                        type="range"
                        min={0}
                        max={100}
                        step={0.5}
                        value={manualHz}
                        onChange={(e) => setManualHz(Number(e.target.value))}
                        className="w-full"
                    />
                  </div>
              )}
            </div>
            {strobeMode === "auto" && (
                <p className="text-xs text-slate-500">
                  Auto maps music energy to <strong>0–100 Hz</strong> and updates smoothly.
                </p>
            )}
          </div>

          {/* Preview (strobe shown visually, capped to ~30 Hz) */}
          <div className="mt-2 flex justify-center">
            <ChromaPreview
                rows={rows}
                cols={cols}
                frame={frame}
                serpentine
                strobeHz={previewStrobeHz}
            />
          </div>

          {/* Wake Lock */}
          <label className="mt-2 flex items-center gap-2 text-sm">
            <input
                type="checkbox"
                checked={keepAwake}
                onChange={(e) => setKeepAwake(e.target.checked)}
            />
            Keep screen awake
          </label>
      </div>
    </div>
  );
}
