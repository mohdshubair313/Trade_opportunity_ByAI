"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  TrendingUp,
  LayoutDashboard,
  Search,
  History,
  Star,
  Settings,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  CreditCard,
  LogOut,
  User,
  Bell,
  GitCompareArrows,
  Mic,
  Sun,
  Moon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useFavorites } from "@/hooks/useFavorites";
import { useTheme } from "@/components/ui/ThemeProvider";
import { listAlerts, getAnalysisHistory } from "@/lib/api";
import { isAuthenticated as checkAuth } from "@/lib/api";

type NavItem = {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href: string;
  badgeKey?: "alerts";
};

const navItems: NavItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: Search, label: "New Analysis", href: "/dashboard?new=true" },
  { icon: GitCompareArrows, label: "Compare", href: "/compare" },
  { icon: Mic, label: "Voice Agent", href: "/voice" },
  { icon: Bell, label: "Alerts", href: "/alerts", badgeKey: "alerts" },
  { icon: History, label: "History", href: "/history" },
  { icon: Star, label: "Favorites", href: "/favorites" },
  { icon: CreditCard, label: "Upgrade", href: "/pricing" },
  { icon: Settings, label: "Settings", href: "/settings" },
];

export function Sidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [search, setSearch] = useState("");
  const [unreadAlerts, setUnreadAlerts] = useState(0);
  const [analysisCount, setAnalysisCount] = useState(0);
  const { user, logout } = useAuth();
  const { favorites } = useFavorites();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    setSearch(window.location.search);
    const onChange = () => setSearch(window.location.search);
    window.addEventListener("popstate", onChange);
    return () => window.removeEventListener("popstate", onChange);
  }, []);

  // Poll unread alert count every 60s while the sidebar is mounted.
  useEffect(() => {
    if (!checkAuth()) return;
    let cancelled = false;
    const load = () =>
      listAlerts(false, 1)
        .then((res) => !cancelled && setUnreadAlerts(res.unread))
        .catch(() => { });
    load();
    const id = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  // Pull the count of this user's saved analyses for the Quick Stats panel.
  // Refresh on navigation so the number is current after a new analysis or
  // a delete from /history. We request page=1 with per_page=1 and read the
  // `total` field — no need to hydrate the full list in the sidebar.
  useEffect(() => {
    if (!checkAuth()) {
      setAnalysisCount(0);
      return;
    }
    let cancelled = false;
    getAnalysisHistory(1, 1)
      .then((res) => !cancelled && setAnalysisCount(res.total))
      .catch(() => !cancelled && setAnalysisCount(0));
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return (
    <motion.aside
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className={cn(
        "sticky top-0 h-screen bg-card border-r border-border flex flex-col transition-all duration-300",
        isCollapsed ? "w-[72px]" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-border">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-emerald-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary/20">
            <TrendingUp className="h-5 w-5 text-white" />
          </div>
          <AnimatePresence>
            {!isCollapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                className="font-bold text-lg overflow-hidden whitespace-nowrap"
              >
                Trade<span className="text-primary">Insight</span>
              </motion.span>
            )}
          </AnimatePresence>
        </Link>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 rounded-lg hover:bg-muted transition-colors"
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto">
        <ul className="space-y-1 px-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href ||
              (item.href.includes("?") && pathname + search === item.href);

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "relative flex items-center gap-3 px-4 py-2.5 rounded-full transition-all duration-300",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  <AnimatePresence>
                    {!isCollapsed && (
                      <motion.span
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: "auto" }}
                        exit={{ opacity: 0, width: 0 }}
                        className="overflow-hidden whitespace-nowrap text-sm"
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                  {!isCollapsed && item.label === "Upgrade" && (
                    <span className="ml-auto px-2 py-0.5 rounded-full bg-primary/20 text-primary text-xs">
                      Pro
                    </span>
                  )}
                  {item.badgeKey === "alerts" && unreadAlerts > 0 && (
                    <span
                      className={cn(
                        "ml-auto min-w-[20px] h-5 px-1.5 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold flex items-center justify-center",
                        isCollapsed && "absolute top-1 right-1 ml-0"
                      )}
                    >
                      {unreadAlerts > 9 ? "9+" : unreadAlerts}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Stats */}
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="group relative mt-6 mx-3 p-5 rounded-[1.5rem] bg-muted/30 border border-border/60 hover:border-primary/40 transition-all"
          >
            <div className="absolute top-4 right-5 text-[9px] font-mono font-bold text-muted-foreground/30 group-hover:text-primary/40 transition-colors">
              § STATS
            </div>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Quick Stats</span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Analyses</span>
                <span className="font-medium">{analysisCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Favorites</span>
                <span className="font-medium">{favorites.length}</span>
              </div>
            </div>
          </motion.div>
        )}
      </nav>

      {/* User */}
      <div className="p-4 border-t border-border">
        <div className={cn("flex items-center", isCollapsed ? "justify-center" : "gap-3")}>
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
            <User className="h-5 w-5 text-primary" />
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {user?.username || "Guest"}
              </p>
              <p className="text-xs text-muted-foreground">
                {!user?.username || user.username === "guest" ? "Guest Mode" : "Pro User"}
              </p>
            </div>
          )}
          {!isCollapsed && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={toggleTheme}
                title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
                className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              >
                {theme === "dark" ? (
                  <Sun className="h-4 w-4 text-amber-400" />
                ) : (
                  <Moon className="h-4 w-4 text-slate-700" />
                )}
              </button>
              <button
                type="button"
                onClick={logout}
                title="Log out"
                className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </motion.aside>
  );
}
