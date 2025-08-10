"use client";

import { useBLE } from '@/hooks/useBLE';
import { useEffect, useState } from 'react';

// This data would come from the NFT's metadata
const sessionData = {
  ledEvents: [
    { time: 0, color: [255, 0, 0], brightness: 0.8 }, // time in seconds
    { time: 2, color: [0, 0, 255], brightness: 1.0 },
    { time: 4, color: [255, 255, 0], brightness: 0.5 },
  ],
  binauralBeat: 'url-to-binaural-beat-audio-file.mp3'
};

export function SessionPlayer({ sessionId }: { sessionId: string }) {
  const { sendData, isConnected } = useBLE();
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Load audio element on mount
  useEffect(() => {
    const audioEl = new Audio(sessionData.binauralBeat);
    setAudio(audioEl);
  }, [sessionId]);

  // Sync logic
  useEffect(() => {
    if (!audio) return;
    
    const handleTimeUpdate = () => {
      const currentTime = audio.currentTime;
      // Find the next LED event to send to the device
      const nextEvent = sessionData.ledEvents.find(event => Math.abs(event.time - currentTime) < 0.1);

      if (nextEvent && isConnected) {
        // Encode the color and brightness into a byte array
        // Example: [R, G, B, Brightness*255]
        const data = new Uint8Array([...nextEvent.color, nextEvent.brightness * 255]);
        sendData(data);
      }
    };
    
    audio.addEventListener('timeupdate', handleTimeUpdate);
    return () => audio.removeEventListener('timeupdate', handleTimeUpdate);
  }, [audio, isConnected, sendData]);

  const togglePlay = () => {
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };
  
  if (!isConnected) {
    return <p>Please connect your ChromaMind device to start a session.</p>;
  }

  return (
    <div>
      <h2 className="text-2xl">Playing Session {sessionId}</h2>
      <button onClick={togglePlay} className="p-4 bg-green-500 rounded-full">
        {isPlaying ? 'Pause' : 'Play'}
      </button>
      {/* Add a timeline/scrubber here */}
    </div>
  );
}