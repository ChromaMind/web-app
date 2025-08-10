"use client";

import Link from "next/link";
import { DeviceStatusIndicator } from "@/components/ble/DeviceStatusIndicator";
import { useHasMounted } from "@/hooks/useHasMounted"; // <-- Import the hook

export function Header() {
  const hasMounted = useHasMounted(); // <-- Use the hook

  return (
    <header className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link href="/trips" className="font-bold text-xl text-slate-800">
              ChromaMind
            </Link>
            <nav className="hidden md:flex gap-6">
              {/* ... nav links ... */}
            </nav>
          </div>
          <div className="flex items-center gap-4">
            {/* Conditionally render the client-side components */}
            {hasMounted && (
              <>
                <DeviceStatusIndicator />
                <w3m-button />
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}