"use client";

import Link from "next/link";
import { DeviceStatusIndicator } from "@/components/ble/DeviceStatusIndicator";
import { useHasMounted } from "@/hooks/useHasMounted";

export function Header() {
  const hasMounted = useHasMounted();

  return (
    <header className="bg-white sticky top-0 z-30 border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex-shrink-0">
            <Link href="/trips" className="font-bold text-xl text-slate-900">
              ChromaMind
            </Link>
          </div>

          {/* Desktop Navigation - Unchanged */}
          <nav className="hidden md:flex md:items-center md:gap-8">
            <Link href="/trips" className="text-sm font-medium text-slate-600 hover:text-slate-900">
              My Trips
            </Link>
            <Link href="/settings" className="text-sm font-medium text-slate-600 hover:text-slate-900">
              Settings
            </Link>
          </nav>

          {/* Right-side Icons - Hamburger Menu is removed */}
          <div className="flex items-center gap-4">
            {hasMounted && (
              <>
                <div className="hidden sm:flex">
                  <DeviceStatusIndicator />
                </div>
                <w3m-button />
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}