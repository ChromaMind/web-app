"use client";

import React, { createContext, useContext, useRef, useState, useEffect, ReactNode, useCallback } from 'react';
import type { SessionDetails } from '@/services/nftService';

interface PlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  isReady: boolean;
  currentSession: SessionDetails | null;
}

interface PlayerContextType extends PlayerState {
  play: () => Promise<void>;
  pause: () => void;
  seek: (time: number) => void;
  loadSession: (session: SessionDetails) => void;
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
  const [currentSession, setCurrentSession] = useState<SessionDetails | null>(null);

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

  const loadSession = useCallback((session: SessionDetails) => {
    if (audioRef.current) {
      audioRef.current.src = session.audioUrl;
      audioRef.current.load();
      setCurrentSession(session);
      setIsReady(false); // Will be set to true when metadata loads
    }
  }, []);

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
    loadSession,
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
