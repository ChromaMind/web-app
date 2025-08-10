"use client";

import Link from "next/link";
import { DeviceStatusIndicator } from "@/components/ble/DeviceStatusIndicator";
import { MobileNav } from "./MobileNav"; // <-- Import the new component
import { useHasMounted } from "@/hooks/useHasMounted";

export function Header() {
  const hasMounted = useHasMounted();

  return (
    <header className="bg-white sticky top-0 z-30 border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo - always visible */}
          <div className="flex-shrink-0">
            <Link href="/trips" className="font-bold text-xl text-slate-900">
              ChromaMind
            </Link>
          </div>

          {/* Desktop Navigation - Hidden on mobile */}
          <nav className="hidden md:flex md:items-center md:gap-8">
            <Link href="/trips" className="text-sm font-medium text-slate-600 hover:text-slate-900">
              My Trips
            </Link>
            <Link href="/device" className="text-sm font-medium text-slate-600 hover:text-slate-900">
              Device
            </Link>
          </nav>

          {/* Right-side Icons & Buttons */}
          <div className="flex items-center gap-4">
            {hasMounted && (
              <>
                <div className="hidden sm:flex"> {/* Hide status indicator on very small screens */}
                  <DeviceStatusIndicator />
                </div>
                <w3m-button />
              </>
            )}
            
            {/* --- MOBILE NAV TRIGGER --- */}
            {/* The MobileNav component now lives here */}
            <MobileNav />
          </div>
          
        </div>
      </div>
    </header>
  );
}