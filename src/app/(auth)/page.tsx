"use client";

import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { useEffect } from 'react';

export default function Home() {
  const { isConnected } = useAccount();
  const router = useRouter();

  // Redirect to dashboard if the user is already connected
  useEffect(() => {
    if (isConnected) {
      router.push('/dashboard');
    }
  }, [isConnected, router]);

  return (
    <div className="font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20">
      <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start">
        <h1 className="text-2xl font-bold">Welcome to My DApp</h1>
        <p>Please connect your wallet to proceed.</p>
        <w3m-button />
      </main>
    </div>
  );
}