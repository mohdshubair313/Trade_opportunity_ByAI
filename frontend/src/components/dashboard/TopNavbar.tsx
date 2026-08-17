"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { TrendingUp, User, LogOut, Sun, Moon } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/components/ui/ThemeProvider";
import { cn } from "@/lib/utils";

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
    <header className="sticky top-0 z-40 w-full border-b border-hairline bg-canvas px-4 lg:px-8 h-[56px] flex flex-col justify-center">
      <div className="flex items-center justify-between gap-4 max-w-7xl mx-auto h-8">
        {/* Left: Brand & Page Title Breadcrumb */}
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-sm bg-canvas-soft border border-hairline flex items-center justify-center group-hover:bg-canvas transition-colors">
              <TrendingUp className="h-4 w-4 text-primary" strokeWidth={2.5} />
            </div>
            <span className="font-bold tracking-tight text-body-md-strong text-ink hidden sm:block leading-none mt-0.5">
              TradeInsight<span className="text-primary">.AI</span>
            </span>
          </Link>
          <span className="text-hairline-soft text-body-sm hidden sm:inline leading-none mt-0.5">/</span>
          <span className="text-body-sm-strong text-mute flex items-center leading-none mt-0.5">
            {pageTitle}
          </span>
        </div>

        {/* Right: Actions & Profile */}
        <div className="flex items-center gap-4">
          {/* Quick links pill */}
          <div className="hidden md:flex items-center gap-3 text-eyebrow-mono text-mute mr-2">
            <Link
              href="/dashboard"
              className={cn(
                "transition-colors hover:text-ink",
                pathname === "/dashboard" && "text-primary"
              )}
            >
              DASHBOARD
            </Link>
            <Link
              href="/compare"
              className={cn(
                "transition-colors hover:text-ink",
                pathname === "/compare" && "text-primary"
              )}
            >
              COMPARE
            </Link>
            <Link
              href="/pricing"
              className={cn(
                "transition-colors hover:text-ink",
                pathname === "/pricing" && "text-primary"
              )}
            >
              PRICING
            </Link>
          </div>

          {/* User profile & Logout */}
          {user ? (
            <div className="flex items-center gap-3 pl-4 border-l border-hairline h-6">
              <button
                onClick={toggleTheme}
                className="w-6 h-6 flex items-center justify-center rounded-xs bg-canvas-soft border border-hairline text-mute hover:text-ink transition-colors"
                title="Toggle Theme"
              >
                {theme === "dark" ? <Sun className="h-3 w-3" /> : <Moon className="h-3 w-3" />}
              </button>
              <div className="flex items-center gap-2 ml-1">
                <div className="w-6 h-6 rounded-xs bg-canvas-soft border border-hairline flex items-center justify-center">
                  <User className="h-3 w-3 text-primary" />
                </div>
                <span className="text-code-strong text-ink hidden sm:inline max-w-[100px] truncate leading-none mt-0.5">
                  {user.username}
                </span>
              </div>
              <button
                type="button"
                onClick={logout}
                title="Sign out"
                className="text-mute hover:text-ink transition-colors flex items-center justify-center"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="pl-4 border-l border-hairline h-6 flex items-center gap-3">
              <button
                onClick={toggleTheme}
                className="w-6 h-6 flex items-center justify-center rounded-xs bg-canvas-soft border border-hairline text-mute hover:text-ink transition-colors"
                title="Toggle Theme"
              >
                {theme === "dark" ? <Sun className="h-3 w-3" /> : <Moon className="h-3 w-3" />}
              </button>
              <Link href="/login" className="flex items-center">
                <span className="text-button-md px-md py-xs rounded-xs bg-primary text-on-primary hover:bg-primary-soft transition-colors leading-none">
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
