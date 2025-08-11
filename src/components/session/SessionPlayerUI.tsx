"use client";

import { useEffect, useRef, useState } from "react";
import type { SessionDetails } from "@/services/nftService";
import ChromaPreview, { LedRGBFrame } from "@/components/session/ChromaPreview";

type PlayerEngine = any; // placeholder

interface SessionPlayerUIProps {
  session: SessionDetails;
  player: PlayerEngine;
  isDeviceConnected: boolean;
}

const formatTime = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
};

export function SessionPlayerUI({ session }: SessionPlayerUIProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const seeking = useRef(false);

  const [frame, setFrame] = useState<LedRGBFrame>(new Uint8Array(2 * 16 * 3)); // 2×16 RGB

  const rows = 2;
  const cols = 16;

  // Audio time + metadata
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onLoaded = () => setDuration(audio.duration || 0);
    const onTime = () => { if (!seeking.current) setCurrent(audio.currentTime || 0); };
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => { setPlaying(false); setCurrent(0); };
    const onError = () => console.error("Audio error:", audio.error);

    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);

    return () => {
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
    };
  }, []);

  // FFT visualizer for ChromaPreview
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || analyserRef.current) return;

    const ctx = new AudioContext();
    const src = ctx.createMediaElementSource(audio);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 64;
    src.connect(analyser);
    analyser.connect(ctx.destination);
    analyserRef.current = analyser;

    const freqData = new Uint8Array(analyser.frequencyBinCount);

    let rafId: number;
    const loop = () => {
      analyser.getByteFrequencyData(freqData);

      const rgbFrame = new Uint8Array(rows * cols * 3);
      for (let i = 0; i < rows * cols; i++) {
        const v = freqData[i % freqData.length];
        rgbFrame[i * 3 + 0] = v;                // R
        rgbFrame[i * 3 + 1] = 255 - v;          // G
        rgbFrame[i * 3 + 2] = (v * 2) % 255;    // B
      }
      setFrame(rgbFrame);

      rafId = requestAnimationFrame(loop);
    };
    loop();

    return () => cancelAnimationFrame(rafId);
  }, [rows, cols]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (audio.paused) {
      audio.play().catch((e) => console.error("play() failed:", e));
    } else {
      audio.pause();
    }
  };

  const onSeekStart = () => (seeking.current = true);
  const onSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => setCurrent(Number(e.target.value));
  const onSeekEnd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const t = Number(e.target.value);
    audio.currentTime = t;
    setCurrent(t);
    seeking.current = false;
  };

  const progress = duration ? (current / duration) * 100 : 0;

  return (
      <div className="max-w-md mx-auto rounded-xl shadow-2xl border border-slate-200 overflow-hidden relative">
        <audio ref={audioRef} src="/audios/rave.mp3" preload="auto" />

        <div className="absolute inset-0 z-10 bg-white/60 backdrop-blur-md" />

        <div className="relative z-20 p-6 sm:p-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold">{session.name ?? "Rave Session"}</h2>
            <p className="text-gray-600">{session.description ?? "Play /audios/rave.mp3"}</p>
          </div>

          {/* LED Preview */}
          <div className="mt-6 flex justify-center">
            <ChromaPreview rows={rows} cols={cols} frame={frame} serpentine={true} strobeHz={0} />
          </div>

          {/* time */}
          <div className="mt-6 flex justify-between text-sm">
            <span>{formatTime(current)}</span>
            <span>{formatTime(duration)}</span>
          </div>

          {/* progress */}
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
                className="absolute top-0 w-full h-2 opacity-0 cursor-pointer"
                aria-label="Seek"
            />
          </div>

          {/* toggle */}
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
