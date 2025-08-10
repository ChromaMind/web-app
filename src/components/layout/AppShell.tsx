import { Header } from "@/components/core/Header";
import { ReactNode } from "react";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    // Use a light gray background for the main content area
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Header />
      <main className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}