"use client";

import React, { createContext, useState, ReactNode } from 'react';
import type { Session } from '@/app/(main)/trips/page'; // Reuse the Session type

// Define the shape of the context data
interface SessionContextType {
  currentSession: Session | null;
  isPlaying: boolean;
  playbackTime: number; // in seconds
  loadSession: (session: Session) => void;
  togglePlay: () => void;
  seek: (time: number) => void;
}

// Create the context
export const SessionContext = createContext<SessionContextType | undefined>(undefined);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);

  const loadSession = (session: Session) => {
    setCurrentSession(session);
    setIsPlaying(false);
    setPlaybackTime(0);
  };

  const togglePlay = () => {
    if (!currentSession) return;
    setIsPlaying(prev => !prev);
  };

  const seek = (time: number) => {
    setPlaybackTime(time);
  };

  // Here you would also manage the <audio> element state
  // For simplicity, we keep the state management separate from the element itself

  return (
    <SessionContext.Provider value={{ currentSession, isPlaying, playbackTime, loadSession, togglePlay, seek }}>
      {children}
    </SessionContext.Provider>
  );
}