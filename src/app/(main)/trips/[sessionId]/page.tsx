"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { getSessionDetails, SessionDetails } from '@/services/nftService';
import { Loader } from '@/components/core/Loader';
import { CommentCard } from '@/components/session/CommentCard'; // We will create this next

// A simple component to display metadata with an icon-like feel
const MetaPill = ({ label, value }: { label: string, value: string }) => (
  <div className="card-glass flex flex-col items-center justify-center p-3 rounded-lg text-center">
    <span className="text-xs text-slate-400 uppercase font-mono">{label}</span>
    <span className="text-md font-bold text-slate-100">{value}</span>
  </div>
);

export default function TripDetailsPage({ params }: { params: { sessionId: string } }) {
  const [session, setSession] = useState<SessionDetails | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getSessionDetails(params.sessionId)
      .then(data => data ? setSession(data) : setError("Trip not found."))
      .catch(() => setError("Failed to load trip data."));
  }, [params.sessionId]);

  if (error) return <div className="card-glass text-center text-red-400 p-8 rounded-lg">{error}</div>;
  if (!session) return <Loader />;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* --- Main Details Card --- */}
      <div className="card-glass rounded-xl shadow-2xl shadow-black/30 p-6 md:p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left Column: Image */}
          <div className="w-full h-80 relative rounded-lg overflow-hidden">
            <Image src={session.imageUrl} alt={session.name} layout="fill" objectFit="cover" />
          </div>
          
          {/* Right Column: Info & Play Button */}
          <div className="flex flex-col">
            <h1 className="text-4xl font-bold text-white">{session.name}</h1>
            <p className="text-sm text-slate-400 mt-1">
              A session by <span className="font-semibold text-slate-300">{session.creator}</span>
            </p>
            <p className="text-slate-300 mt-4 flex-grow">{session.description}</p>
            
            <div className="grid grid-cols-3 gap-4 my-6">
              <MetaPill label="Category" value={session.category} />
              <MetaPill label="Intensity" value={session.intensity} />
              <MetaPill label="Duration" value={`${session.duration} min`} />
            </div>

            <Link
              href={`/player/${session.id}`}
              className="bg-blue-600 text-white text-center font-bold py-4 px-6 rounded-lg text-lg shadow-lg shadow-blue-500/20 transition-all duration-300 hover:bg-blue-500 hover:scale-105"
            >
              Begin Session
            </Link>
          </div>
        </div>
      </div>

      {/* --- Comments Section --- */}
      <div className="card-glass rounded-xl p-6 md:p-8">
        <h2 className="text-2xl font-bold text-white mb-6">Community Feedback</h2>
        <div className="space-y-6">
          {session.comments.map((comment, index) => (
            <CommentCard key={index} author={comment.author} avatarUrl={comment.avatarUrl} text={comment.text} />
          ))}
        </div>
      </div>
    </div>
  );
}