"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';

// --- THIS IS THE CORRECTED IMPORT ---
// We import HiSparkles and HiCog for the solid versions.
import { HiOutlineSparkles, HiOutlineCog, HiSparkles, HiCog } from 'react-icons/hi';
import { IconType } from 'react-icons';

// Define the structure for our navigation items
const navItems = [
  // --- THIS IS THE CORRECTED DATA ---
  { href: '/trips', label: 'Trips', icon: HiOutlineSparkles, activeIcon: HiSparkles },
  { href: '/settings', label: 'Settings', icon: HiOutlineCog, activeIcon: HiCog },
];

// A small sub-component to keep the mapping logic clean (This part is unchanged)
const DockItem = ({ href, label, Icon, ActiveIcon, isActive }: {
  href: string;
  label: string;
  Icon: IconType;
  ActiveIcon: IconType;
  isActive: boolean;
}) => {
  return (
    <Link href={href} className="flex flex-col items-center justify-center gap-1 w-full h-full">
      {isActive 
        ? <ActiveIcon className="w-6 h-6 text-blue-600" />
        : <Icon className="w-6 h-6 text-slate-500" />
      }
      <span className={`text-xs ${isActive ? 'font-bold text-blue-600' : 'text-slate-500'}`}>
        {label}
      </span>
    </Link>
  );
};

export function BottomDock() {
  const pathname = usePathname();

  return (
    <footer className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-slate-200 z-30">
      <div className="flex justify-around items-center h-full">
        {navItems.map((item) => (
          <DockItem
            key={item.href}
            href={item.href}
            Icon={item.icon}
            ActiveIcon={item.activeIcon}
            label={item.label}
            isActive={pathname.startsWith(item.href)}
          />
        ))}
      </div>
    </footer>
  );
}