"use client";

import Image from "next/image";
import Link from "next/link";
import type { Session } from "@/app/(main)/trips/page";

export function SessionCard({ session }: { session: Session }) {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden transition-transform hover:scale-105">
      <div className="relative h-48 w-full">
        <Image src={session.imageUrl} alt={session.name} layout="fill" objectFit="cover" />
      </div>
      <div className="p-4">
        <h3 className="text-lg font-bold">{session.name}</h3>
        <p className="text-sm text-slate-600 mt-1">{session.description}</p>
        <div className="mt-4 flex justify-between items-center">
          <span className="text-xs text-slate-500">{(session.duration / 60).toFixed(0)} min</span>
          
          {/* --- THE FIX IS HERE --- */}
          <Link 
            href={`/player/${session.id}`}
            className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-semibold hover:bg-blue-700"
          >
            Start Session
          </Link>
          
        </div>
      </div>
    </div>
  );
}