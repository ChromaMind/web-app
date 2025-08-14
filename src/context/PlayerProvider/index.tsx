"use client";

import React, {
  createContext,
  useContext,
  useRef,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import type { Trip } from "@/types/nft";

interface PlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  isReady: boolean;
  currentSession: Trip | null;

  fftBins: Uint8Array | null;
  bass: number;
  mid: number;
  treble: number;
  energy: number;
}

interface PlayerContextType extends PlayerState {
  play: () => Promise<void>;
  pause: () => void;
  seek: (time: number) => void;
  skip: (deltaSeconds: number) => void;
  loadTrip: (session: Trip) => void;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  analyser: AnalyserNode | null;
  ctx: AudioContext | null;
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

let globalCtx: AudioContext | null = null;
let globalSource: MediaElementAudioSourceNode | null = null;
let globalAnalyser: AnalyserNode | null = null;

export function PlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [currentSession, setCurrentSession] = useState<Trip | null>(null);
  const [ctx, setCtx] = useState<AudioContext | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [fftBins, setFftBins] = useState<Uint8Array | null>(null);
  const [bass, setBass] = useState(0);
  const [mid, setMid] = useState(0);
  const [treble, setTreble] = useState(0);
  const [energy, setEnergy] = useState(0);

  useEffect(() => {
    if (!audioRef.current) {
      const audio = new Audio();
      audio.preload = "metadata";
      audio.crossOrigin = "anonymous";
      audioRef.current = audio;
    }
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onLoadedMetadata = () => {
      setDuration(audio.duration || 0);
      setIsReady(true);
    };
    const onTimeUpdate = () => setCurrentTime(audio.currentTime || 0);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => setIsPlaying(false);

    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
    };
  }, []);

  useEffect(() => {
    if (!audioRef.current) return;

    if (!globalCtx) {
      globalCtx = new AudioContext();
      setCtx(globalCtx);
    } else {
      setCtx(globalCtx);
    }

    if (!globalSource) {
      globalSource = globalCtx.createMediaElementSource(audioRef.current);
    }

    if (!globalAnalyser) {
      globalAnalyser = globalCtx.createAnalyser();
      globalAnalyser.fftSize = 128;
      globalSource.connect(globalAnalyser);
      globalAnalyser.connect(globalCtx.destination);
    }

    setAnalyser(globalAnalyser);
  }, []);

  useEffect(() => {
    if (!analyser || !isPlaying) return;

    analyser.fftSize = 128;
    if (ctx && ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    const bins = new Uint8Array(analyser.frequencyBinCount);
    let raf: number | null = null;
    let lastStreamMs = 0;
    let lastUIBinsMs = 0;

    const streamFpsMs = 33;
    const uiBinsFpsMs = 66;

    const loop = () => {
      raf = requestAnimationFrame(loop);
      const now = performance.now();
      if (now - lastStreamMs < streamFpsMs) return;
      lastStreamMs = now;

      analyser.getByteFrequencyData(bins);
      const n = bins.length;
      const bEnd = Math.max(2, Math.floor(n * 0.12));
      const mEnd = Math.max(bEnd + 1, Math.floor(n * 0.45));

      let sumB = 0, sumM = 0, sumT = 0, sumAll = 0;
      for (let i = 0; i < bEnd; i++) sumB += bins[i];
      for (let i = bEnd; i < mEnd; i++) sumM += bins[i];
      for (let i = mEnd; i < n; i++) sumT += bins[i];
      for (let i = 0; i < n; i++) sumAll += bins[i];

      setBass(sumB / bEnd);
      setMid(sumM / (mEnd - bEnd));
      setTreble(sumT / (n - mEnd));
      setEnergy(sumAll / n);

      if (now - lastUIBinsMs >= uiBinsFpsMs) {
        lastUIBinsMs = now;
        setFftBins(new Uint8Array(bins));
      }
    };

    raf = requestAnimationFrame(loop);
    return () => { if (raf) cancelAnimationFrame(raf); };
  }, [analyser, isPlaying, ctx]);

  const loadTrip = useCallback((session: Trip) => {
    const audio = audioRef.current;
    if (!audio) return;

    const isSameTrip = currentSession?.id === session.id;
    const wasPlaying = isPlaying;

    if (!isSameTrip) {
      audio.src = session.audioUrl;
      audio.load();
      setCurrentSession(session);
      setIsReady(false);
    } else {
      setCurrentSession(session);
      if (wasPlaying && audio.paused) {
        audio.play().catch(() => {});
      }
    }
  }, [currentSession, isPlaying]);

  const play = useCallback(async () => {
    if (audioRef.current && isReady) {
      try {
        await audioRef.current.play();
        setIsPlaying(true);
        if (ctx && ctx.state === "suspended") {
          await ctx.resume();
        }
      } catch (error) {
        console.error("Failed to play audio:", error);
      }
    }
  }, [isReady, ctx]);

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  const seek = useCallback((time: number) => {
    if (audioRef.current && isReady) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  }, [isReady]);

  const skip = useCallback((deltaSeconds: number) => {
    if (audioRef.current && isReady) {
      const target = Math.min(Math.max(currentTime + deltaSeconds, 0), duration);
      seek(target);
    }
  }, [isReady, currentTime, duration, seek]);

  const value: PlayerContextType = {
    isPlaying,
    currentTime,
    duration,
    isReady,
    currentSession,
    fftBins,
    bass,
    mid,
    treble,
    energy,
    play,
    pause,
    seek,
    skip,
    loadTrip,
    audioRef,
    analyser,
    ctx,
  };

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer() {
  const context = useContext(PlayerContext);
  if (context === undefined) {
    throw new Error("usePlayer must be used within a PlayerProvider");
  }
  return context;
}
