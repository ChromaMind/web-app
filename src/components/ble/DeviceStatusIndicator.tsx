"use client";

import { useBLE } from "@/hooks/useBLE";
import { useHasMounted } from "@/hooks/useHasMounted"; // <-- Import the hook

export function DeviceStatusIndicator() {
  const hasMounted = useHasMounted(); // <-- Use the hook
  const { isConnected, isConnecting } = useBLE();

  // If the component hasn't mounted yet, render nothing.
  // This guarantees the server and initial client render are identical.
  if (!hasMounted) {
    return null;
  }

  const getStatus = () => {
    if (isConnecting) return { text: "Connecting...", color: "bg-yellow-400" };
    if (isConnected) return { text: "Connected", color: "bg-green-500" };
    return { text: "Disconnected", color: "bg-red-500" };
  };

  const { text, color } = getStatus();

  return (
    <div className="flex items-center gap-2">
      <span className={`relative flex h-3 w-3`}>
        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${color} opacity-75`}></span>
        <span className={`relative inline-flex rounded-full h-3 w-3 ${color}`}></span>
      </span>
      <span className="text-sm text-slate-700">{text}</span>
    </div>
  );
}