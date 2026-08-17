"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { User, LogOut, Sun, Moon } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/components/ui/ThemeProvider";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/compare": "Compare Sectors",
  "/pricing": "Pricing & Plans",
  "/history": "Analysis History",
  "/favorites": "Favorite Sectors",
  "/alerts": "Alerts & Watchlist",
  "/voice": "Voice Agent Studio",
  "/settings": "Account Settings",
  "/results": "Sector Report",
  "/contact": "Contact & Support",
};

export function TopNavbar({ title }: { title?: string }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const pageTitle = title || PAGE_TITLES[pathname] || "TradeInsight AI";

  return (
    <header className="sticky top-0 z-40 w-full border-b border-hairline bg-canvas/80 backdrop-blur-md px-4 lg:px-8 h-16 flex flex-col justify-center">
      <div className="flex items-center justify-between gap-4 max-w-7xl w-full mx-auto">
        {/* Left: Page Context */}
        <div className="flex items-center">
          <h1 className="text-body-lg-strong text-ink tracking-tight">{pageTitle}</h1>
        </div>

        {/* Right: Actions & Profile */}
        <div className="flex items-center gap-4">


          {/* User profile & Logout */}
          {user ? (
            <div className="flex items-center gap-2 bg-canvas-soft border border-hairline rounded-full p-1 shadow-sm">
              <button
                onClick={toggleTheme}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-canvas border border-transparent text-mute hover:text-ink hover:border-hairline transition-all"
                title="Toggle Theme"
              >
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
              
              <div className="flex items-center gap-2 pl-2 pr-4 border-l border-hairline/50 ml-1">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-3.5 w-3.5 text-primary" />
                </div>
                <span className="text-body-sm-strong text-ink hidden sm:inline max-w-[100px] truncate">
                  {user.username}
                </span>
              </div>
              
              <button
                type="button"
                onClick={logout}
                title="Sign out"
                className="w-8 h-8 flex items-center justify-center rounded-full text-mute hover:text-destructive hover:bg-destructive/10 transition-colors mr-1"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-canvas-soft border border-hairline rounded-full p-1 shadow-sm">
              <button
                onClick={toggleTheme}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-canvas border border-transparent text-mute hover:text-ink hover:border-hairline transition-all"
                title="Toggle Theme"
              >
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
              <Link href="/login" className="flex items-center pr-1 pl-1">
                <span className="text-button-md px-5 py-2 rounded-full bg-primary text-on-primary hover:bg-primary-soft active:scale-[0.97] transition-all duration-150 ease-out-strong shadow-sm leading-none flex items-center justify-center">
                  Sign In
                </span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
