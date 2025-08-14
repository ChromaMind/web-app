"use client";

import { useState, useEffect } from 'react';
import { PlayIcon, HeartIcon, EyeIcon } from '@heroicons/react/24/solid';
import { HeartIcon as HeartOutlineIcon } from '@heroicons/react/24/outline';
import { getTrips } from '@/services/nftService';
import type { Collection, Trip } from '@/types/nft';
import Image from 'next/image';
import { TripCard } from '@/components/nft/TripCard';

export default function TripsPage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [likedTrips, setLikedTrips] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTrips = async () => {
      setIsLoading(true);
      try {
        const data = await getTrips();
        setTrips(data);
      } catch (error) {
        console.error('Failed to fetch trips:', error);
        setTrips([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTrips();
  }, []);

  const handleLike = (tripId: string) => {
    setLikedTrips(prev => {
      const newLiked = new Set(prev);
      if (newLiked.has(tripId)) {
        newLiked.delete(tripId);
      } else {
        newLiked.add(tripId);
      }
      return newLiked;
    });
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading trips...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Trips</h1>
            <p className="text-slate-600 mt-2">
              Discover audio-visual experiences on ChromaMind
            </p>
          </div>
        </div>
      </div>

      {/* Main Content - Instagram-like Feed */}
      <div className="max-w-7xl mx-auto p-6">
        {trips.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-slate-400 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-2">No trips available</h3>
            <p className="text-slate-500">Trips will appear here once they're created and minted.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trips.map((trip) => (
              <TripCard key={trip.id} trip={trip} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}