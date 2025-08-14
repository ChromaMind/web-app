"use client";
import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { getTripsForOwner } from '@/services/nftService';
import type { Trip } from '@/types/nft';
import { Loader } from '@/components/core/Loader';
import { OwnedNFTCard } from '@/components/nft/OwnedNFTCard';
import { UserIcon } from '@heroicons/react/24/outline';
import { TripCard } from '@/components/nft/TripCard';

export default function MyTripsPage() {
  const { address, isConnected } = useAccount();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTrips = async () => {
      if (!address) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const data = await getTripsForOwner(address);
        setTrips(data);
      } catch (error) {
        console.error('Failed to fetch user trips:', error);
        setTrips([]);
      } finally {
        setIsLoading(false);
      }
    };

    if (isConnected) {
      fetchTrips();
    } else {
      setIsLoading(false);
    }
  }, [address, isConnected]);

  if (isLoading) return <Loader />;

  if (!isConnected) {
    return (
      <div className="text-center py-20">
        <div className="text-slate-400 mb-4">
          <UserIcon className="mx-auto h-12 w-12" />
        </div>
        <h3 className="text-lg font-medium text-slate-900 mb-2">Connect Your Wallet</h3>
        <p className="text-slate-500">
          Please connect your wallet to see the trips you own.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">My Trips</h1>
        <p className="text-slate-600 mt-2">
          Here are the audio-visual experiences you've collected.
        </p>
      </div>

      {trips.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-slate-400 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 21L3 14.25M3 14.25L9.75 7.5M3 14.25h18" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-slate-900 mb-2">No Trips Yet</h3>
          <p className="text-slate-500">
            You don't own any trips yet. Explore the collections to start your journey.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {trips.map((trip) => (
            <TripCard key={trip.id} trip={trip} />
          ))}
        </div>
      )}
    </div>
  );
}
