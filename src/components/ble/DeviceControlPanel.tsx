"use client";

import { useBLE } from '@/hooks/useBLE';
import { useHasMounted } from '@/hooks/useHasMounted';
import { DeviceConnectButton } from './DeviceConnectButton';
import { DeviceStatusIndicator } from './DeviceStatusIndicator';
import ChromaPreview from '@/components/session/ChromaPreview';
import { useState, useEffect } from 'react';
import { renderPattern, ALL_PATTERN_IDS, PATTERN_LABELS, type PatternId } from '@/lib/ledPatterns';
import { usePlayer } from '@/context/PlayerProvider';

export function DeviceControlPanel() {
  const hasMounted = useHasMounted();
  const { isConnected, device, sendData, sendStrobe } = useBLE();
  const [currentPattern, setCurrentPattern] = useState<number[][]>(Array(16).fill([0, 0, 0]));
  const [currentStrobeHz, setCurrentStrobeHz] = useState<number>(0);
  const [selectedPattern, setSelectedPattern] = useState<PatternId>('shift');
  const [patternBrightness, setPatternBrightness] = useState<number>(0.8);
  
  // Use main player state
  const { isPlaying, currentTime, currentSession } = usePlayer();

  // Function to render and send a pattern
  const renderAndSendPattern = (patternId: PatternId, brightness: number = 1) => {
    const pattern = renderPattern(patternId, {
      rows: 2,
      cols: 8,
      t: 0,
      bass: 128,
      mid: 128,
      treble: 128,
      energy: 128,
    });
    
    // Convert to 2D array for sendData
    const pattern2D: number[][] = [];
    for (let i = 0; i < pattern.length; i += 3) {
      pattern2D.push([
        Math.round(pattern[i] * brightness),
        Math.round(pattern[i + 1] * brightness),
        Math.round(pattern[i + 2] * brightness),
      ]);
    }
    
    setCurrentPattern(pattern2D);
    sendData(pattern2D);
  };

  // Effect to update pattern when player state changes
  useEffect(() => {
    if (!isConnected || !isPlaying) return;

    // Render pattern with current time from main player
    const pattern = renderPattern(selectedPattern, {
      rows: 2,
      cols: 8,
      t: currentTime,
      bass: 128, // Default values when not streaming
      mid: 128,
      treble: 128,
      energy: 128,
    });

    // Convert to 2D array for sendData
    const pattern2D: number[][] = [];
    for (let i = 0; i < pattern.length; i += 3) {
      pattern2D.push([
        Math.round(pattern[i] * patternBrightness),
        Math.round(pattern[i + 1] * patternBrightness),
        Math.round(pattern[i + 2] * patternBrightness),
      ]);
    }

    setCurrentPattern(pattern2D);
    sendData(pattern2D);

    // Send strobe if enabled
    if (currentStrobeHz > 0) {
      sendStrobe(currentStrobeHz);
    }
  }, [isConnected, isPlaying, currentTime, selectedPattern, patternBrightness, currentStrobeHz, sendData, sendStrobe]);

  if (!hasMounted) {
    return (
      <div className="bg-slate-50 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-slate-900 mb-4">Device Connection</h3>
        <div className="animate-pulse">
          <div className="h-4 bg-slate-200 rounded mb-2"></div>
          <div className="h-8 bg-slate-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 rounded-lg p-4">
      <h3 className="text-sm font-semibold text-slate-900 mb-4">Device Connection</h3>
      
      {/* Connection Status */}
      <div className="flex items-center gap-3 mb-4">
        <DeviceStatusIndicator />
        {device && (
          <span className="text-xs text-slate-600">
            {device.name || 'Unnamed Device'}
          </span>
        )}
      </div>

      {/* Connection Controls */}
      <div className="mb-4">
        <DeviceConnectButton />
      </div>

      {/* LED Preview - Show when connected */}
      {isConnected && (
        <div className="mb-4 pt-3 border-t border-slate-200">
          <label className="block text-xs text-slate-600 mb-2">LED Pattern Preview</label>
          <div className="flex justify-center">
            <ChromaPreview
              rows={2}
              cols={8}
              frame={new Uint8Array(currentPattern.flat())}
              strobeHz={currentStrobeHz}
              cellSize={20}
              gap={4}
              className="bg-slate-100 p-4 rounded-lg"
            />
          </div>
        </div>
      )}

      {/* Device Controls - Only show when connected */}
      {isConnected && (
        <div className="space-y-3 pt-3 border-t border-slate-200">
          <div>
            <label className="block text-xs text-slate-600 mb-2">LED Pattern Control</label>
            
            {/* Pattern Selection */}
            <div className="mb-3">
              <label className="block text-xs text-slate-600 mb-1">Pattern Type</label>
              <select
                value={selectedPattern}
                onChange={(e) => {
                  const patternId = e.target.value as PatternId;
                  setSelectedPattern(patternId);
                  renderAndSendPattern(patternId, patternBrightness);
                }}
                className="w-full p-2 border border-slate-200 rounded text-xs"
              >
                {ALL_PATTERN_IDS.map((id) => (
                  <option key={id} value={id}>
                    {PATTERN_LABELS[id] ?? id}
                  </option>
                ))}
              </select>
            </div>

            {/* Brightness Control */}
            <div className="mb-3">
              <label className="block text-xs text-slate-600 mb-1">Brightness Level</label>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={patternBrightness * 100}
                onChange={(e) => {
                  const brightness = Number(e.target.value) / 100;
                  setPatternBrightness(brightness);
                  renderAndSendPattern(selectedPattern, brightness);
                }}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-600 mb-2">Strobe Frequency</label>
            <div className="space-y-2">
              <input
                type="range"
                min="0"
                max="60"
                step="1"
                value={currentStrobeHz}
                onChange={(e) => {
                  const hz = Number(e.target.value);
                  setCurrentStrobeHz(hz);
                  if (hz > 0) {
                    sendStrobe(hz);
                  }
                }}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-orange-500"
              />
              <div className="flex justify-between text-xs text-slate-500">
                <span>0 Hz</span>
                <span className="font-mono">{currentStrobeHz} Hz</span>
                <span>60 Hz</span>
              </div>
            </div>
          </div>

          {/* Status Info */}
          <div className="mt-3 pt-3 border-t border-slate-200">
            <div className="text-xs text-slate-500 text-center">
              {isPlaying ? (
                <div className="text-green-600">
                  🎵 Synced with main player • Pattern: {PATTERN_LABELS[selectedPattern] ?? selectedPattern}
                </div>
              ) : (
                <div className="text-slate-400">
                  ⏸️ Waiting for main player to start
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
