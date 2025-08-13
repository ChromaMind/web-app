"use client";

import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { getSessionsForOwner, getSessionDetails, SessionDetails } from '@/services/nftService';
import { SessionCard } from '@/components/session/SessionCard';
import { Loader } from '@/components/core/Loader';

export default function TripsPage() {
  const { address } = useAccount();
  const [sessions, setSessions] = useState<SessionDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSessions = async () => {
      if (!address) return;
      setIsLoading(true);
      try {
        const userSessions = await getSessionsForOwner(address);
        // Get full details for each session
        const detailedSessions = await Promise.all(
          userSessions.map(session => getSessionDetails(session.id))
        );
        setSessions(detailedSessions.filter(Boolean) as SessionDetails[]);
      } catch (error) {
        console.error('Failed to fetch sessions:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSessions();
  }, [address]);

  if (isLoading) return <Loader />;

  return (
    <div className="max-w-7xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-slate-900 mb-8">Your Trips</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sessions.map(session => (
          <SessionCard key={session.id} session={session} />
        ))}
      </div>
    </div>
  );
}