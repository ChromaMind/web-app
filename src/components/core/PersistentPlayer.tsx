"use client";

import { usePlayer } from '@/context/PlayerProvider';
import { formatTime } from '@/utils/formatTime';
import { PlayIcon, PauseIcon, ForwardIcon, BackwardIcon } from '@heroicons/react/24/solid';
import { MusicalNoteIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { DeviceControlPanel } from '@/components/ble/DeviceControlPanel';

export function PersistentPlayer() {
  const [isExpanded, setIsExpanded] = useState(false);
  const router = useRouter();
  

  const {
    isPlaying,
    currentTime,
    duration,
    isReady,
    currentSession,
    play,
    pause,
    seek,
    skip,
  } = usePlayer();

  if (!currentSession || !isReady) {
    return null;
  }

  const progress = duration ? (currentTime / duration) * 100 : 0;

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    seek(time);
  };

  const handleExpandClick = () => {
    const newExpandedState = !isExpanded;
    setIsExpanded(newExpandedState);
    
    // If expanding to fullscreen, scroll the controller section into view within the player
    if (newExpandedState) {
      // Use setTimeout to ensure state update happens first, then scroll
      setTimeout(() => {
        const playerContainer = document.querySelector('[data-persistent-player]');
        const controllerSection = document.querySelector('[data-controller-section]');
        if (playerContainer && controllerSection) {
          // Scroll the player container to focus on the controller section
          const containerRect = playerContainer.getBoundingClientRect();
          const sectionRect = controllerSection.getBoundingClientRect();
          const scrollTop = sectionRect.top - containerRect.top;
          
          playerContainer.scrollTo({
            top: scrollTop,
            behavior: 'smooth'
          });
        }
      }, 100);
    }
  };

    return (
    <div 
        className={`fixed bg-white border-t border-slate-200 shadow-lg z-50 bottom-0 left-0 right-0 transition-all duration-300 ${
          isExpanded ? 'h-screen overflow-y-auto' : 'h-20'
        }`}
        data-persistent-player
      >
      <div className="max-w-7xl mx-auto px-4 py-3">
        {/* Fixed Header with Player Controls */}
        <div className={`${isExpanded ? 'fixed top-0 left-0 right-0 bg-white border-b border-slate-200 px-4 py-3 z-20' : ''}`}>
          <div className="max-w-7xl mx-auto flex items-center gap-4">
          {/* Session Info - Clickable to navigate to player page */}
          <div 
            className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer hover:bg-slate-50 rounded-lg p-2 transition-colors"
            onClick={() => router.push(`/trips/${currentSession.id}`)}
            title="Click to view session details"
          >
            <div className="w-12 h-12 bg-slate-200 rounded-lg overflow-hidden flex-shrink-0">
              {currentSession.imageUrl && (
                <img 
                  src={currentSession.imageUrl} 
                  alt={currentSession.name}
                  className="w-full h-full object-cover"
                />
              )}
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-slate-900 truncate">{currentSession.name}</h3>
              <p className="text-sm text-slate-500 truncate">by {currentSession.creator}</p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => skip(-10)}
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-full"
              title="Skip back 10s"
            >
              <BackwardIcon className="w-5 h-5" />
            </button>
            
            <button
              onClick={isPlaying ? pause : play}
              className="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 flex-shrink-0"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <PauseIcon className="w-6 h-6" />
              ) : (
                <PlayIcon className="w-6 h-6" />
              )}
            </button>
            
            <button
              onClick={() => skip(10)}
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-full"
              title="Skip forward 10s"
            >
              <ForwardIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Progress */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <span className="text-sm text-slate-600 w-12 text-right">
              {formatTime(currentTime)}
            </span>
            <div className="flex-1 relative">
              <input
                type="range"
                min={0}
                max={Math.floor(duration)}
                step={1}
                value={Math.floor(currentTime)}
                onChange={handleSeek}
                className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <div 
                className="absolute top-0 left-0 h-1 bg-blue-600 rounded-lg pointer-events-none"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-sm text-slate-600 w-12">
              {formatTime(duration)}
            </span>
          </div>

          {/* Expand/Collapse Button */}
          <button
            onClick={handleExpandClick}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors"
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            <MusicalNoteIcon className={`w-5 h-5 transition-transform duration-300 ${
              isExpanded ? 'rotate-180' : 'rotate-0'
            }`} />
          </button>
        </div>
        </div>

                {/* Expanded Controls Section */}
        {isExpanded && (
          <div 
            className="mt-20 border-t border-slate-200 pt-4"
            data-controller-section
          >
                  <div className="space-y-6">
                                   {/* Device Control Dashboard */}
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       {/* Device Connection */}
                       <DeviceControlPanel />

                {/* LED Pattern Control */}
                <div className="bg-slate-50 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-slate-900 mb-4">LED Pattern</h3>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-slate-600 mb-1">Pattern Type</label>
                      <select 
                        className="w-full p-2 border border-slate-200 rounded text-xs"
                        defaultValue="auto"
                      >
                        <option value="auto">Auto (Beat Reactive)</option>
                        <option value="arrow">↔ Arrow</option>
                        <option value="double-arrow">⇄ Double Arrow</option>
                        <option value="expand">Expanding</option>
                        <option value="top">Top Row</option>
                        <option value="bottom">Bottom Row</option>
                        <option value="top-bottom">Top + Bottom</option>
                        <option value="shift">Shift</option>
                        <option value="sparkle">Random Sparkle</option>
                        <option value="white">Full White</option>
                        <option value="inward">Inward</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs text-slate-600 mb-1">Brightness Level</label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        defaultValue="80"
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      />
                      <div className="flex justify-between text-xs text-slate-500 mt-1">
                        <span>0%</span>
                        <span>50%</span>
                        <span>100%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Audio Control */}
              <div className="bg-slate-50 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-slate-900 mb-4">Audio Control</h3>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">Volume Level</label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      defaultValue="80"
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                    <div className="flex justify-between text-xs text-slate-500 mt-1">
                      <span>0%</span>
                      <span>50%</span>
                      <span>100%</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-600 mb-1">Sync Delay (ms)</label>
                    <input
                      type="range"
                      min="0"
                      max="1000"
                      step="50"
                      defaultValue="0"
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                    <div className="flex justify-between text-xs text-slate-500 mt-1">
                      <span>0ms</span>
                      <span>500ms</span>
                      <span>1000ms</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Session Info */}
              <div className="bg-slate-50 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-slate-900 mb-4">Session Info</h3>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="text-center">
                    <div className="text-lg font-bold text-blue-600">{currentSession.category}</div>
                    <div className="text-xs text-slate-500">Category</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-orange-600">{currentSession.intensity}</div>
                    <div className="text-xs text-slate-500">Intensity</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-green-600">{currentSession.duration} min</div>
                    <div className="text-xs text-slate-500">Duration</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
