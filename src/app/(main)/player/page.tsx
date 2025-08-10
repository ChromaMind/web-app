"use client";

import { SessionPlayer } from "@/components/session/SessionPlayer";
import { Loader } from "@/components/core/Loader";
import { useAccount } from "wagmi";

export default function PlayerPage({ params }: { params: { sessionId: string } }) {
  const { isConnected: isWalletConnected } = useAccount();

  if (!isWalletConnected) {
    return <Loader />; // Or a message to connect wallet
  }

  return (
    <div>
      <SessionPlayer sessionId={params.sessionId} />
    </div>
  );
}