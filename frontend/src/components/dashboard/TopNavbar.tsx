"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { TrendingUp, User, LogOut } from "lucide-react";
import { ExpandToggle } from "@/components/ui/ExpandToggle";
import { useAuth } from "@/hooks/useAuth";
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
  const pageTitle = title || PAGE_TITLES[pathname] || "TradeInsight AI";

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur-xl px-4 lg:px-8 py-3 transition-colors duration-300">
      <div className="flex items-center justify-between gap-4 max-w-7xl mx-auto">
        {/* Left: Brand & Page Title Breadcrumb */}
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-md shadow-primary/20 group-hover:scale-105 transition-transform">
              <TrendingUp className="h-4 w-4 text-primary-foreground" strokeWidth={2.5} />
            </div>
            <span className="font-bold tracking-tight text-sm hidden sm:inline">
              TradeInsight<span className="text-primary">.AI</span>
            </span>
          </Link>
          <span className="text-border text-sm hidden sm:inline">/</span>
          <span className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            {pageTitle}
          </span>
        </div>

        {/* Right: Actions, Expand Theme Toggle & Profile */}
        <div className="flex items-center gap-3">
          {/* Quick links pill */}
          <div className="hidden md:flex items-center gap-1.5 text-xs text-muted-foreground mr-2">
            <Link
              href="/dashboard"
              className={cn(
                "px-2.5 py-1 rounded-lg transition-colors hover:text-foreground hover:bg-muted",
                pathname === "/dashboard" && "bg-muted font-medium text-foreground"
              )}
            >
              Dashboard
            </Link>
            <Link
              href="/compare"
              className={cn(
                "px-2.5 py-1 rounded-lg transition-colors hover:text-foreground hover:bg-muted",
                pathname === "/compare" && "bg-muted font-medium text-foreground"
              )}
            >
              Compare
            </Link>
            <Link
              href="/pricing"
              className={cn(
                "px-2.5 py-1 rounded-lg transition-colors hover:text-foreground hover:bg-muted",
                pathname === "/pricing" && "bg-muted font-medium text-foreground"
              )}
            >
              Pricing
            </Link>
          </div>

          {/* Expand Light / Dark Mode Toggle */}
          <ExpandToggle size="md" />

          {/* User profile & Logout */}
          {user ? (
            <div className="flex items-center gap-2 pl-2 border-l border-border/60">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <span className="text-xs font-semibold hidden sm:inline max-w-[100px] truncate">
                  {user.username}
                </span>
              </div>
              <button
                type="button"
                onClick={logout}
                title="Sign out"
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <Link href="/login" className="pl-2 border-l border-border/60">
              <span className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                Sign In
              </span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
