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
import type { SessionDetails } from "@/services/nftService";

interface PlayerState {
    isPlaying: boolean;
    currentTime: number;
    duration: number;
    isReady: boolean;
    currentSession: SessionDetails | null;

    // NEW: FFT outputs (mirrors SessionPlayerUI)
    fftBins: Uint8Array | null; // throttled copy for UI
    bass: number;               // 0..255
    mid: number;                // 0..255
    treble: number;             // 0..255
    energy: number;             // 0..255
}

interface PlayerContextType extends PlayerState {
    play: () => Promise<void>;
    pause: () => void;
    seek: (time: number) => void;
    loadSession: (session: SessionDetails) => void;
    skip: (deltaSeconds: number) => void;
    audioRef: React.RefObject<HTMLAudioElement | null>;
    analyser: AnalyserNode | null;
    ctx: AudioContext | null;
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

// Keep these across mounts so we don't hit InvalidStateError
let globalCtx: AudioContext | null = null;
let globalSource: MediaElementAudioSourceNode | null = null;
let globalAnalyser: AnalyserNode | null = null;

export function PlayerProvider({ children }: { children: ReactNode }) {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isReady, setIsReady] = useState(false);
    const [currentSession, setCurrentSession] = useState<SessionDetails | null>(null);

    const [ctx, setCtx] = useState<AudioContext | null>(null);
    const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);

    // NEW: FFT state exposed to consumers (UI-throttled bins + scalar bands)
    const [fftBins, setFftBins] = useState<Uint8Array | null>(null);
    const [bass, setBass] = useState(0);
    const [mid, setMid] = useState(0);
    const [treble, setTreble] = useState(0);
    const [energy, setEnergy] = useState(0);

    // Initialize audio element
    useEffect(() => {
        if (!audioRef.current) {
            const audio = new Audio();
            audio.preload = "metadata";
            audioRef.current = audio;
        }
    }, []);

    // Wire up audio event listeners
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const onLoadedMetadata = () => {
            setDuration(audio.duration || 0);
            setIsReady(true);
        };

        const onTimeUpdate = () => {
            setCurrentTime(audio.currentTime || 0);
        };

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

    // Set up AudioContext + Analyser for FFT
    useEffect(() => {
        if (!audioRef.current) return;

        if (!globalCtx) {
            globalCtx = new AudioContext();
            setCtx(globalCtx);
        }

        if (!globalSource) {
            globalSource = globalCtx.createMediaElementSource(audioRef.current);
        }

        if (!globalAnalyser) {
            globalAnalyser = globalCtx.createAnalyser();
            globalAnalyser.fftSize = 128; // EXACTLY like SessionPlayerUI
            globalSource.connect(globalAnalyser);
            globalAnalyser.connect(globalCtx.destination);
        }

        setAnalyser(globalAnalyser);
    }, []);

    // NEW: Single FFT loop that mirrors SessionPlayerUI (fftSize=128, ~30fps, same band split)
    useEffect(() => {
        if (!analyser || !isPlaying) return;

        // ensure same config
        analyser.fftSize = 128;

        if (ctx && ctx.state === "suspended") {
            ctx.resume().catch(() => {});
        }

        const bins = new Uint8Array(analyser.frequencyBinCount);
        let raf: number | null = null;
        let lastStreamMs = 0;
        let lastUIBinsMs = 0;

        const streamFpsMs = 33;  // ~30 fps like SessionPlayerUI
        const uiBinsFpsMs = 66;  // ~15 fps to avoid UI churn

        const loop = () => {
            raf = requestAnimationFrame(loop);
            const now = performance.now();
            if (now - lastStreamMs < streamFpsMs) return;
            lastStreamMs = now;

            analyser.getByteFrequencyData(bins);

            // Compute bands — identical split to SessionPlayerUI
            const n = bins.length;
            const bEnd = Math.max(2, Math.floor(n * 0.12));
            const mEnd = Math.max(bEnd + 1, Math.floor(n * 0.45));

            let sumB = 0, sumM = 0, sumT = 0, sumAll = 0;
            for (let i = 0; i < bEnd; i++) sumB += bins[i];
            for (let i = bEnd; i < mEnd; i++) sumM += bins[i];
            for (let i = mEnd; i < n; i++) sumT += bins[i];
            for (let i = 0; i < n; i++) sumAll += bins[i];

            const bassVal = sumB / bEnd;
            const midVal = sumM / (mEnd - bEnd);
            const trebleVal = sumT / (n - mEnd);
            const energyVal = sumAll / n;

            // Update scalar band state every tick (cheap)
            setBass(bassVal);
            setMid(midVal);
            setTreble(trebleVal);
            setEnergy(energyVal);

            // Throttle the heavy UI bins copy
            if (now - lastUIBinsMs >= uiBinsFpsMs) {
                lastUIBinsMs = now;
                setFftBins(new Uint8Array(bins));
            }
        };

        raf = requestAnimationFrame(loop);
        return () => { if (raf) cancelAnimationFrame(raf); };
    }, [analyser, isPlaying, ctx]);

    const loadSession = useCallback((session: SessionDetails) => {
        if (audioRef.current) {
            audioRef.current.src = session.audioUrl;
            audioRef.current.load();
            setCurrentSession(session);
            setIsReady(false);
        }
    }, []);

    const play = useCallback(async () => {
        if (audioRef.current && isReady) {
            try {
                await audioRef.current.play();
                setIsPlaying(true);
                if (ctx && ctx.state === "suspended") {
                    await ctx.resume(); // Needed for browsers with autoplay restrictions
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

        // FFT outputs available everywhere (DeviceControlPanel, etc.)
        fftBins,
        bass,
        mid,
        treble,
        energy,

        play,
        pause,
        seek,
        loadSession,
        skip,
        audioRef,
        analyser,
        ctx,
    };

    return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer() {
    const context = useContext(PlayerContext);
    if (!context) {
        throw new Error("usePlayer must be used within a PlayerProvider");
    }
    return context;
}
