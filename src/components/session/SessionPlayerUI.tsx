"use client";

import Link from "next/link";
import Image from "next/image";
import type { SessionDetails } from "@/services/nftService";
import type { useSessionPlayerEngine } from "@/hooks/useSessionPlayerEngine";
import { useHasMounted } from "@/hooks/useHasMounted";
import { useEffect } from "react";

type PlayerEngine = ReturnType<typeof useSessionPlayerEngine>;

interface SessionPlayerUIProps {
  session: SessionDetails;
  player: PlayerEngine;
  isDeviceConnected: boolean;
}

const formatTime = (timeInSeconds: number) => { /* ... unchanged ... */ };

export function SessionPlayerUI({ session, player, isDeviceConnected }: SessionPlayerUIProps) {
  const hasMounted = useHasMounted();

  // --- THIS IS THE CORE FIX ---
  // The UI component now directly controls the audio element.
  const handlePlayPause = () => {
    if (!player.audioRef.current) return;

    if (player.isPlaying) {
      player.audioRef.current.pause();
      player.pause(); // Update state in the hook
    } else {
      // This play() is triggered directly by the user's click, satisfying browser policy.
      player.audioRef.current.play().catch(error => {
        console.error("Audio playback failed:", error);
      });
      player.play(); // Update state in the hook
    }
  };

  // Sync the audio element's playing state with our React state
  useEffect(() => {
    const audio = player.audioRef.current;
    if (!audio) return;
    
    const syncPlay = () => player.setIsPlaying(true);
    const syncPause = () => player.setIsPlaying(false);

    audio.addEventListener('play', syncPlay);
    audio.addEventListener('pause', syncPause);

    return () => {
        audio.removeEventListener('play', syncPlay);
        audio.removeEventListener('pause', syncPause);
    }
  }, [player.audioRef, player.setIsPlaying]);


  if (!hasMounted) { /* ... unchanged ... */ }
  if (!isDeviceConnected) { /* ... unchanged ... */ }

  return (
    <div className="max-w-md mx-auto rounded-xl shadow-2xl border border-slate-200 overflow-hidden relative">
      {/* Background Image Layer (unchanged) */}
      <div className="absolute inset-0 z-0">
          {/* ... */}
      </div>
      {/* Glassmorphism Overlay (unchanged) */}
      <div className="absolute inset-0 z-10 bg-white/60 backdrop-blur-md"></div>
      
      {/* Content Layer */}
      <div className="relative z-20 p-6 sm:p-8">
        {/* Title and description (unchanged) */}
        <div className="text-center">
            {/* ... */}
        </div>
        
        {/* Scrubber / Range slider (unchanged) */}
        <div className="mt-8">
            {/* ... */}
        </div>

        {/* Play/Pause Button - now uses handlePlayPause */}
        <div className="flex justify-center items-center mt-6">
          <button
            onClick={handlePlayPause} // <-- Use the new direct handler
            disabled={!player.isReady}
            className="bg-blue-600 text-white rounded-full w-20 h-20 flex items-center justify-center text-4xl shadow-lg ..."
            aria-label={player.isPlaying ? 'Pause' : 'Play'}
          >
            {player.isPlaying ? '❚❚' : '▶'}
          </button>
        </div>
      </div>
    </div>
  );
}