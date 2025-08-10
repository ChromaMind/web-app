"use client";

import { useBLE } from '@/hooks/useBLE';
import { useHasMounted } from '@/hooks/useHasMounted'; // <-- Import the hook

export function DeviceConnectButton() {
  const hasMounted = useHasMounted(); // <-- Use the hook
  const { connect, disconnect, isConnected, isConnecting, device } = useBLE();

  if (!hasMounted) {
    return null; // Or return a disabled placeholder button
  }

  if (isConnected && device) {
    return (
      <div className="flex items-center gap-4">
        <p>Connected to: {device.name}</p>
        <button onClick={disconnect} className="bg-red-500 text-white p-2 rounded">
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button onClick={connect} disabled={isConnecting} className="bg-blue-500 text-white p-2 rounded">
      {isConnecting ? 'Connecting...' : 'Connect to ChromaMind Device'}
    </button>
  );
}