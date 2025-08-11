// components/session/SessionPlayerUI.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import type { SessionDetails } from "@/services/nftService";
import ChromaPreview, { type LedRGBFrame } from "@/components/session/ChromaPreview";
import { useBLE } from "@/hooks/useBLE";
import { useWakeLock } from "@/hooks/useWakeLock";

type PlayerEngine = any;

interface Props {
  session: SessionDetails;
  player: PlayerEngine;
  isDeviceConnected?: boolean;
}

const fmt = (s: number) =>
    `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, "0")}`;

export function SessionPlayerUI({ session }: Props) {
  // Keep screen awake (helps Android keep JS alive)
  const [keepAwake, setKeepAwake] = useState(true);
  useWakeLock(keepAwake);

  // BLE provider (single source of truth)
  const { sendData, isConnected } = useBLE();

  // Audio + analyser refs
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);

  // UI state
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const seeking = useRef(false);

  // LED preview (2x16)
  const rows = 2, cols = 16, ledCount = rows * cols;
  const [frame, setFrame] = useState<LedRGBFrame>(new Uint8Array(ledCount * 3));

  // Device brightness (applies only to BLE output, not preview)
  const [bleBrightness, setBleBrightness] = useState(0.25);
  const bleBrightnessRef = useRef(bleBrightness);
  useEffect(() => { bleBrightnessRef.current = bleBrightness; }, [bleBrightness]);

  // Bind audio events
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;

    const onLoaded = () => setDuration(a.duration || 0);
    const onTime = () => { if (!seeking.current) setCurrent(a.currentTime || 0); };
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => { setPlaying(false); setCurrent(0); };

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
  }, []);

  // Create analyser + RAF loop once (on first play)
  const setupAnalyserIfNeeded = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
    if (analyserRef.current) return; // already set

    const ctx = audioCtxRef.current;
    const src = ctx.createMediaElementSource(audio);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 64;
    src.connect(analyser);
    analyser.connect(ctx.destination);
    analyserRef.current = analyser;

    const freqData = new Uint8Array(analyser.frequencyBinCount);
    let lastSend = 0;

    const loop = () => {
      analyser.getByteFrequencyData(freqData);

      // Full-brightness preview frame
      const rgbFrame = new Uint8Array(ledCount * 3);
      for (let i = 0; i < ledCount; i++) {
        const v = freqData[i % freqData.length]; // 0..255
        rgbFrame[i * 3 + 0] = v;
        rgbFrame[i * 3 + 1] = 255 - v;
        rgbFrame[i * 3 + 2] = (v * 2) % 255;
      }
      setFrame(rgbFrame);

      // Send to device (dimmed), throttled ~30fps
      const now = performance.now();
      if (now - lastSend >= 33 && isConnected) {
        const b = bleBrightnessRef.current;
        const scaledColors: number[][] = new Array(ledCount);

        if (b <= 0) {
          for (let i = 0; i < ledCount; i++) scaledColors[i] = [0, 0, 0];
        } else {
          for (let i = 0; i < ledCount; i++) {
            scaledColors[i] = [
              Math.floor(rgbFrame[i * 3 + 0] * b),
              Math.floor(rgbFrame[i * 3 + 1] * b),
              Math.floor(rgbFrame[i * 3 + 2] * b),
            ];
          }
        }
        void sendData(scaledColors);
        lastSend = now;
      }

      rafRef.current = requestAnimationFrame(loop);
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

  // Seek handlers (prevents timeupdate fighting while dragging)
  const onSeekStart = () => { seeking.current = true; };
  const onSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrent(Number(e.target.value)); // visual only while dragging
  };
  const onSeekEnd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const a = audioRef.current;
    if (!a) return;
    const t = Number(e.target.value);
    a.currentTime = t;       // jump to position
    setCurrent(t);           // sync UI
    seeking.current = false; // resume timeupdate syncing
  };

  // Cleanup RAF on unmount (keep context alive to avoid rebind churn)
  useEffect(() => {
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, []);

  const progress = duration ? (current / duration) * 100 : 0;

  return (
      <div className="max-w-md mx-auto rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
        <audio ref={audioRef} src={session.audioUrl ?? "/audios/rave.mp3"} preload="auto" />

        <div className="relative z-20 p-6 sm:p-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold">{session.name ?? "Rave Session"}</h2>
            <p className="text-gray-600">{session.description ?? "LED Music Visualizer"}</p>
          </div>

          {/* LED Preview (full brightness) */}
          <div className="mt-6 flex justify-center">
            <ChromaPreview rows={rows} cols={cols} frame={frame} serpentine strobeHz={0} />
          </div>

          {/* Time row */}
          <div className="mt-6 flex justify-between text-sm">
            <span>{fmt(current)}</span>
            <span>{fmt(duration)}</span>
          </div>

          {/* Progress + seek (overlayed invisible range on top of bar) */}
          <div className="mt-2 relative">
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

          {/* Device brightness (BLE only) */}
          <div className="mt-4">
            <label className="block text-sm text-gray-600 mb-1">
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
            <label className="mt-3 flex items-center gap-2 text-sm">
              <input
                  type="checkbox"
                  checked={keepAwake}
                  onChange={(e) => setKeepAwake(e.target.checked)}
              />
              Keep screen awake
            </label>
          </div>

          {/* Play/Pause */}
          <div className="flex justify-center items-center mt-6">
            <button
                onClick={togglePlay}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-full w-20 h-20 flex items-center justify-center text-4xl shadow-lg transition-colors"
                aria-label={playing ? "Pause" : "Play"}
            >
              {playing ? "❚❚" : "▶"}
            </button>
          </div>
        </div>
      </div>
  );
}
