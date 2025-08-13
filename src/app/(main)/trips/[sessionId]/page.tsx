"use client";

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getSessionDetails, SessionDetails } from '@/services/nftService';
import { usePlayer } from '@/context/PlayerProvider';
import { Loader } from '@/components/core/Loader';
import { PlayIcon, PauseIcon } from '@heroicons/react/24/solid';

export default function TripDetailsPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { loadSession, isPlaying, currentSession, play, pause } = usePlayer();
  const [session, setSession] = useState<SessionDetails | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getSessionDetails(sessionId)
      .then(data => {
        if (data) {
          setSession(data);
          loadSession(data); // Load into global player
        } else {
          setError("Trip not found.");
        }
      })
      .catch(() => setError("Failed to load trip data."));
  }, [sessionId, loadSession]);

  const handlePlayPause = () => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  };

  if (error) return <div className="bg-white text-center text-red-500 p-8 rounded-lg">{error}</div>;
  if (!session) return <Loader />;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="relative mb-8">
          <div className="w-full h-96 bg-slate-200 rounded-2xl overflow-hidden">
            {session.imageUrl && (
              <img 
                src={session.imageUrl} 
                alt={session.name}
                className="w-full h-full object-cover"
              />
            )}
          </div>
          
          {/* Play Button */}
          <div className="absolute bottom-6 right-6">
            <button
              onClick={handlePlayPause}
              className="p-4 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors shadow-lg"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <PauseIcon className="w-8 h-8" />
              ) : (
                <PlayIcon className="w-8 h-8" />
              )}
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl p-8 shadow-sm">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">{session.name}</h1>
          <p className="text-slate-600 mb-6">by {session.creator}</p>
          
          <p className="text-slate-700 leading-relaxed text-lg mb-8">{session.description}</p>

          {/* Session Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="text-center p-4 bg-slate-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{session.category}</div>
              <div className="text-sm text-slate-500 uppercase tracking-wide">Category</div>
            </div>
            <div className="text-center p-4 bg-slate-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{session.intensity}</div>
              <div className="text-sm text-slate-500 uppercase tracking-wide">Intensity</div>
            </div>
            <div className="text-center p-4 bg-slate-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{session.duration} min</div>
              <div className="text-sm text-slate-500 uppercase tracking-wide">Duration</div>
            </div>
          </div>

          {/* Comments Section */}
          {session.comments && session.comments.length > 0 && (
            <div className="border-t border-slate-200 pt-8 mt-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-6">Community Feedback</h2>
              <div className="space-y-6">
                {session.comments.map((comment: any, index: number) => (
                  <div key={index} className="border-l-4 border-slate-200 pl-6">
                    <div className="flex items-center gap-4 mb-3">
                      <img 
                        src={comment.avatarUrl} 
                        alt={comment.author}
                        className="w-10 h-10 rounded-full"
                      />
                      <span className="font-semibold text-slate-900">{comment.author}</span>
                    </div>
                    <p className="text-slate-700 leading-relaxed">{comment.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}