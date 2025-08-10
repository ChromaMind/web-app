"use client";

import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { getSessionsForOwner } from '@/services/nftService'; // We will define this service
import { SessionCard } from '@/components/session/SessionCard';
import { Loader } from '@/components/core/Loader';

// Mock session type
export type Session = {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  duration: number; // in seconds
};

export default function TripsPage() {
  const { address } = useAccount();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSessions = async () => {
      if (!address) return;
      setIsLoading(true);
      // This is where you'd call your service to get NFT data
      const userSessions = await getSessionsForOwner(address); 
      setSessions(userSessions);
      setIsLoading(false);
    };

    fetchSessions();
  }, [address]);

  if (isLoading) return <Loader />;

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Your Trips</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sessions.map(session => (
          <SessionCard key={session.id} session={session} />
        ))}
      </div>
    </div>
  );
}