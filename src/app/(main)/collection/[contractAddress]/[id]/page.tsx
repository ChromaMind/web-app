"use client";

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { getTripByTokenId } from '@/services/nftService';
import { usePlayer } from '@/context/PlayerProvider';
import { Loader } from '@/components/core/Loader';
import { PlayIcon, PauseIcon } from '@heroicons/react/24/solid';
import { Trip } from '@/types/nft';

export default function CollectionItemPage() {
  const { contractAddress, id } = useParams<{ contractAddress: string; id: string }>();
  const { loadTrip, isPlaying, currentSession, play, pause } = usePlayer();
  
  const [trip, setTrip] = useState<Trip | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTripData = async () => {
      if (!contractAddress || !id) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        const data = await getTripByTokenId(contractAddress, id);
        if (data) {
          setTrip(data);
          
          // Only load the session if it's different from the current one
          if (data.audioUrl && (!currentSession || currentSession.id !== data.id)) {
            loadTrip(data);
          }
        } else {
          setError("Trip not found.");
        }
      } catch (err) {
        console.error('Failed to fetch trip data:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch trip data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTripData();
  }, [contractAddress, id, currentSession?.id]); // Remove loadTrip, add currentSession?.id

  const handlePlayPause = () => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  };

  if (isLoading) return <Loader />;
  if (error) return <div className="bg-white text-center text-red-500 p-8 rounded-lg">{error}</div>;
  if (!trip) return <div className="bg-white text-center text-slate-500 p-8 rounded-lg">Trip not found</div>;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="relative mb-8">
          <div className="w-full h-96 bg-slate-200 rounded-2xl overflow-hidden">
            {trip.imageUrl && (
              <img 
                src={trip.imageUrl} 
                alt={trip.name}
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
          <h1 className="text-4xl font-bold text-slate-900 mb-4">{trip.name}</h1>
          <p className="text-slate-600 mb-6">by {trip.creator}</p>
          
          <p className="text-slate-700 leading-relaxed text-lg mb-8">{trip.description}</p>

          {/* Session Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="text-center p-4 bg-slate-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{trip.category}</div>
              <div className="text-sm text-slate-500 uppercase tracking-wide">Category</div>
            </div>
            <div className="text-center p-4 bg-slate-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{trip.experienceFee || '100'}</div>
              <div className="text-sm text-slate-500 uppercase tracking-wide">Experience Fee</div>
            </div>
            <div className="text-center p-4 bg-slate-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{trip.price || '0.01'}</div>
              <div className="text-sm text-slate-500 uppercase tracking-wide">Price (ETH)</div>
            </div>
          </div>

          {/* Contract Info */}
          <div className="border-t border-slate-200 pt-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Contract Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-500">Contract:</span>
                <span className="ml-2 font-mono text-slate-700">{contractAddress.substring(0, 6)}...{contractAddress.substring(contractAddress.length - 4)}</span>
              </div>
              <div>
                <span className="text-slate-500">Token ID:</span>
                <span className="ml-2 font-mono text-slate-700">{id}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}