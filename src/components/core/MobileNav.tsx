"use client";

import { useState } from 'react';
import Link from 'next/link';

export function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };
  
  // This function now runs directly on the Link's onClick
  const handleLinkClick = () => {
    setIsOpen(false);
  };

  return (
    <div className="md:hidden">
      {/* Hamburger Button */}
      <button
        onClick={toggleMenu}
        className="flex flex-col justify-around w-6 h-6 z-50 relative"
        aria-label="Toggle menu"
      >
        <div className={`w-6 h-0.5 bg-slate-800 rounded-sm transition-transform duration-300 ease-in-out ${isOpen ? 'rotate-45 translate-y-2' : ''}`} />
        <div className={`w-6 h-0.5 bg-slate-800 rounded-sm transition-opacity duration-300 ease-in-out ${isOpen ? 'opacity-0' : 'opacity-100'}`} />
        <div className={`w-6 h-0.5 bg-slate-800 rounded-sm transition-transform duration-300 ease-in-out ${isOpen ? '-rotate-45 -translate-y-2' : ''}`} />
      </button>

      {/* Slide-out Menu Panel */}
      <div
        className={`fixed top-0 left-0 w-full h-full bg-white z-40 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col items-center justify-center h-full space-y-8">
          
          {/* --- CORRECTED LINK PATTERN --- */}
          <Link 
            href="/trips"
            onClick={handleLinkClick}
            className="text-2xl font-bold text-slate-800 hover:text-blue-600"
          >
            My Trips
          </Link>

          <Link
            href="/device"
            onClick={handleLinkClick}
            className="text-2xl font-bold text-slate-800 hover:text-blue-600"
          >
            Device
          </Link>
          
        </div>
      </div>
    </div>
  );
}