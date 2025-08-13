"use client";

import Image from "next/image";
import Link from "next/link";
import type { Session } from "@/services/nftService";

// ... imports
export function SessionCard({ session }: { session: Session }) {
  return (
    <div className="card-glass rounded-lg shadow-2xl shadow-black/20 overflow-hidden transition-all duration-300 hover:border-slate-400 hover:scale-105">
      <div className="relative h-48 w-full">
        <Image src={session.imageUrl} alt={session.name} layout="fill" objectFit="cover" />
        <div className="absolute inset-0 bg-black/20"></div>
      </div>
      <div className="p-5">
        <h3 className="text-xl font-bold text-slate-100">{session.name}</h3>
        <p className="text-sm text-slate-400 mt-1 h-10">{session.description}</p>
        <div className="mt-6 flex justify-between items-center">
          <span className="text-xs font-mono text-slate-500">{session.duration} MIN</span>
          
          {/* --- THIS IS THE CHANGE --- */}
          <Link
            href={`/trips/${session.id}`} 
            className="bg-slate-700/50 text-slate-200 px-4 py-2 rounded-md text-sm font-semibold border border-slate-600 hover:bg-slate-700/80 hover:border-slate-400 transition-colors"
          >
            View Details {/* <-- Updated Text */}
          </Link>

        </div>
      </div>
    </div>
  );
}