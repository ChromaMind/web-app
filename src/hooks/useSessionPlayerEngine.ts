"use client";

import { useState, useEffect, useRef, useCallback } from 'react';

type PlayerEngineOptions = {
  audioUrl: string;
  onTimeUpdate: (currentTime: number) => void;
  onEnded?: () => void;
};

// The hook now returns the audioRef so the UI can directly interact with it.
export function useSessionPlayerEngine({ audioUrl, onTimeUpdate, onEnded }: PlayerEngineOptions) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    if (!audioUrl) {
      setIsReady(false);
      return;
    }

    const audio = new Audio(audioUrl);
    audio.load();
    audioRef.current = audio;

    const onLoadedData = () => {
      if (!audioRef.current) return;
      setDuration(audioRef.current.duration);
      setIsReady(true);
    };

    const onPlaybackEnded = () => {
      setIsPlaying(false);
      onEnded?.();
    };

    const onTimeUpdateInternal = () => {
        if(!audioRef.current) return;
        const newTime = audioRef.current.currentTime;
        setCurrentTime(newTime);
        onTimeUpdate(newTime);
    };

    audio.addEventListener('loadeddata', onLoadedData);
    audio.addEventListener('ended', onPlaybackEnded);
    audio.addEventListener('timeupdate', onTimeUpdateInternal);

    return () => {
      audio.removeEventListener('loadeddata', onLoadedData);
      audio.removeEventListener('ended', onPlaybackEnded);
      audio.removeEventListener('timeupdate', onTimeUpdateInternal);
      audio.pause();
      audioRef.current = null;
    };
  }, [audioUrl, onEnded, onTimeUpdate]);

  // These functions now only manage state. The actual playback is handled in the UI.
  const play = () => setIsPlaying(true);
  const pause = () => setIsPlaying(false);
  
  const seek = (time: number) => {
    if (!audioRef.current || !isReady) return;
    audioRef.current.currentTime = time;
    setCurrentTime(time);
  };

  return { 
    audioRef, // <-- Expose the ref
    isPlaying, 
    isReady, 
    duration, 
    currentTime, 
    play, 
    pause, 
    seek,
    setIsPlaying // Expose setter to sync state
  };
}