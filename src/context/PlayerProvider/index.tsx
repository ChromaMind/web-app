"use client";

import React, { createContext, useContext, useRef, useState, useEffect, ReactNode, useCallback } from 'react';
import type { Trip } from '@/types/nft';

interface PlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  isReady: boolean;
  currentSession: Trip | null;
}

interface PlayerContextType extends PlayerState {
  play: () => Promise<void>;
  pause: () => void;
  seek: (time: number) => void;
  loadTrip: (session: Trip) => void;
  skip: (deltaSeconds: number) => void;
  audioRef: React.RefObject<HTMLAudioElement | null>;
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [currentSession, setCurrentSession] = useState<Trip | null>(null);

  // Initialize audio element
  useEffect(() => {
    if (!audioRef.current) {
      const audio = new Audio();
      audio.preload = 'metadata';
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

    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
    };
  }, []);

  const loadTrip = useCallback((session: Trip) => {
    if (audioRef.current) {
      // Check if we're loading the same trip
      const isSameTrip = currentSession?.id === session.id;
      const wasPlaying = isPlaying;
      const previousTime = currentTime;
      
      // Only reset if it's a different trip
      if (!isSameTrip) {
        audioRef.current.src = session.audioUrl;
        audioRef.current.load();
        setCurrentSession(session);
        setIsReady(false); // Will be set to true when metadata loads
      } else {
        // Same trip - preserve playback state
        setCurrentSession(session);
        // If it was playing, resume playback
        if (wasPlaying && audioRef.current.paused) {
          audioRef.current.play().catch(console.error);
        }
      }
    }
  }, [currentSession?.id, isPlaying, currentTime]);

  const play = useCallback(async () => {
    if (audioRef.current && isReady) {
      try {
        await audioRef.current.play();
        setIsPlaying(true);
      } catch (error) {
        console.error('Failed to play audio:', error);
      }
    }
  }, [isReady]);

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
    play,
    pause,
    seek,
    loadTrip,
    skip,
    audioRef,
  };

  return (
    <PlayerContext.Provider value={value}>
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const context = useContext(PlayerContext);
  if (context === undefined) {
    throw new Error('usePlayer must be used within a PlayerProvider');
  }
  return context;
}
