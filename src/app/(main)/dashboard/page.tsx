"use client";

import { useAccount } from 'wagmi';

export default function DashboardPage() {
  const { address } = useAccount();

  return (
    <div className="font-sans flex flex-col items-center justify-center min-h-screen p-8">
      <header className="absolute top-4 right-4">
        <w3m-button />
      </header>
      <div className="flex flex-col gap-4 items-center">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p>You have successfully logged in.</p>
        {address && (
          <p className="text-sm bg-slate-100 p-2 rounded-md shadow-sm">
            Address: {address}
          </p>
        )}
      </div>
    </div>
  );
}