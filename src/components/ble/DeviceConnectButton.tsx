"use client";

import { useBLE } from '@/hooks/useBLE';
import { useHasMounted } from '@/hooks/useHasMounted';

export function DeviceConnectButton() {
  const hasMounted = useHasMounted();
  const { connect, disconnect, isConnected, isConnecting, device } = useBLE();

  if (!hasMounted) {
    // Render a disabled placeholder to prevent hydration layout shift
    return <button className="bg-slate-200 text-slate-500 p-2 rounded-lg cursor-not-allowed" disabled>Loading...</button>;
  }

  if (isConnected && device) {
    return (
      <div className="flex items-center gap-4 p-3 bg-green-50 rounded-lg border border-green-200">
        <p className="text-sm text-green-800 flex-grow">
          Connected to: <strong className="font-bold">{device.name || 'Unnamed Device'}</strong>
        </p>
        <button onClick={disconnect} className="bg-red-500 text-white text-sm font-semibold py-2 px-4 rounded-lg hover:bg-red-600 transition-colors">
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={connect}
      disabled={isConnecting}
      className="bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors hover:bg-blue-700 disabled:bg-slate-400"
    >
      {isConnecting ? 'Connecting...' : 'Connect to ChromaMind Device'}
    </button>
  );
}