"use client";

import { useAccount } from 'wagmi';
import { useRouter } from 'next/navigation';
import { useEffect, useState, ReactNode } from 'react';
import dynamic from 'next/dynamic'; // <-- Import dynamic

import { SessionProvider } from '@/context/SessionProvider';
import { AppShell } from '@/components/layout/AppShell';
import { Loader } from '@/components/core/Loader';

// Dynamically import BLEProvider with SSR turned off
const BLEProvider = dynamic(
  () => import('@/context/BLEProvider').then(mod => mod.BLEProvider),
  {
    ssr: false,
    loading: () => ( // Optional: Show a loader while the component itself is loading
      <div className="flex justify-center items-center min-h-screen">
        <Loader />
      </div>
    ),
  }
);

export default function MainLayout({ children }: { children: ReactNode }) {
  const { isConnected, isConnecting } = useAccount();
  const router = useRouter();
  const [isVerified, setIsVerified] = useState(false);

  useEffect(() => {
    if (isConnecting) {
      return;
    }
    if (!isConnected) {
      router.replace('/');
    } else {
      setIsVerified(true);
    }
  }, [isConnected, isConnecting, router]);

  if (!isVerified) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader />
      </div>
    );
  }

  // The rest of your component remains the same
  return (
    <BLEProvider>
      <SessionProvider>
        <AppShell>
          {children}
        </AppShell>
      </SessionProvider>
    </BLEProvider>
  );
}