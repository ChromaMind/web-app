import { Header } from "@/components/core/Header";
import { PersistentPlayer } from "@/components/core/PersistentPlayer";
import { ReactNode } from "react";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Header />
      
      {/* 
        CRITICAL CHANGE: Add padding-bottom (pb-24) to the main content area.
        This creates a "safe area" at the bottom of the content so the
        fixed dock doesn't hide the last few items of any list.
      */}
      <main className="p-4 sm:p-6 lg:p-8 pb-24">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>

      <PersistentPlayer />
    </div>
  );
}