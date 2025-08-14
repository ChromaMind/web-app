"use client";

import Link from "next/link";
import { useState } from "react";
import { DeviceStatusIndicator } from "@/components/ble/DeviceStatusIndicator";
import { useHasMounted } from "@/hooks/useHasMounted";
import { UserCircleIcon, Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";


export function Header() {
  const hasMounted = useHasMounted();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <header className="bg-white sticky top-0 z-30 border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex-shrink-0">
            <Link href="/collections" className="font-bold text-xl text-slate-900">
              ChromaMind
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex md:items-center md:gap-8">
            <Link href="/collections" className="text-sm font-medium text-slate-600 hover:text-slate-900">
              Collections
            </Link>
            <Link href="/creator" className="text-sm font-medium text-slate-600 hover:text-slate-900">
              Creator
            </Link>
            <Link href="/settings" className="text-sm font-medium text-slate-600 hover:text-slate-900">
              Settings
            </Link>
          </nav>

          {/* Right-side Icons */}
          <div className="flex items-center gap-4">
            {hasMounted && (
              <>
                <div className="hidden sm:flex">
                  <DeviceStatusIndicator />
                </div>
                <Link 
                  href="/settings" 
                  className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors"
                  title="Settings & Account"
                >
                  <UserCircleIcon className="w-6 h-6" />
                </Link>
              </>
            )}
            
            {/* Mobile menu button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              aria-label="Toggle mobile menu"
            >
              {isMobileMenuOpen ? (
                <XMarkIcon className="w-6 h-6" />
              ) : (
                <Bars3Icon className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white">
          <div className="px-4 py-4 space-y-3">
            <Link 
              href="/collections" 
              className="block px-3 py-2 text-base font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Collections
            </Link>
            <Link 
              href="/creator" 
              className="block px-3 py-2 text-base font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Creator
            </Link>
            <Link 
              href="/settings" 
              className="block px-3 py-2 text-base font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Settings
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}