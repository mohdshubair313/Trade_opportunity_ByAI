"use client";

import React from "react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { TopNavbar } from "@/components/dashboard/TopNavbar";

interface AppLayoutProps {
  children: React.ReactNode;
  title?: string;
}

/**
 * AppLayout: Unified application shell layout for all internal app routes.
 * Ensures exactly ONE TopNavbar and ONE Sidebar are rendered across all interior routes.
 */
export function AppLayout({ children, title }: AppLayoutProps) {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground transition-colors duration-300 antialiased selection:bg-primary/20 selection:text-primary">
      {/* Top Navigation Bar with Expand Theme Toggle & Route Title */}
      <TopNavbar title={title} />

      {/* Main Container with Sidebar + Content */}
      <div className="flex flex-1 relative w-full overflow-hidden">
        {/* Left Navigation Sidebar */}
        <Sidebar />

        {/* Page Content Container */}
        <main className="flex-1 w-full p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
