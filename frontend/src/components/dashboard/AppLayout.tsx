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
    <div className="flex flex-col min-h-screen bg-canvas text-ink antialiased">
      {/* Top Navigation Bar with Route Title */}
      <TopNavbar title={title} />

      {/* Main Container with Sidebar + Content */}
      <div className="flex flex-1 w-full relative">
        {/* Left Navigation Sidebar */}
        <Sidebar />

        {/* Page Content Container */}
        <main className="flex-1 w-full p-lg sm:p-2xl max-w-7xl mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
