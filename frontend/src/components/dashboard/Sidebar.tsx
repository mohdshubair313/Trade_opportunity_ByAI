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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useFavorites } from "@/hooks/useFavorites";
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
        "sticky top-[56px] h-[calc(100vh-56px)] bg-canvas border-r border-hairline flex flex-col transition-all duration-300 z-30",
        isCollapsed ? "w-[72px]" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-hairline">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-sm bg-canvas-soft border border-hairline flex items-center justify-center flex-shrink-0 group-hover:bg-canvas transition-colors">
            <TrendingUp className="h-4 w-4 text-primary" strokeWidth={2.5} />
          </div>
          <AnimatePresence>
            {!isCollapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                className="font-bold tracking-tight text-body-md-strong text-ink overflow-hidden whitespace-nowrap mt-0.5 leading-none"
              >
                TradeInsight<span className="text-primary">.AI</span>
              </motion.span>
            )}
          </AnimatePresence>
        </Link>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 rounded-xs hover:bg-canvas-soft text-mute hover:text-ink transition-colors"
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
                    "relative flex items-center gap-3 px-md py-sm rounded-sm transition-all duration-300",
                    isActive
                      ? "bg-canvas-soft text-primary border border-hairline"
                      : "text-mute hover:bg-canvas-soft hover:text-ink border border-transparent"
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
                    <span className="ml-auto px-xs py-xxs rounded-xs bg-canvas text-primary text-caption-strong border border-hairline">
                      PRO
                    </span>
                  )}
                  {item.badgeKey === "alerts" && unreadAlerts > 0 && (
                    <span
                      className={cn(
                        "ml-auto min-w-[20px] h-5 px-1.5 rounded-sm bg-primary text-on-primary text-caption-strong flex items-center justify-center",
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
            className="group relative mt-6 mx-3 p-xl rounded-sm bg-canvas-soft border border-hairline transition-all"
          >
            <div className="absolute top-3 right-3 text-[10px] font-mono font-bold text-mute group-hover:text-primary transition-colors">
              § STATS
            </div>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-body-sm-strong text-ink">Quick Stats</span>
            </div>
            <div className="space-y-2 text-body-sm font-mono text-mute">
              <div className="flex justify-between">
                <span>Analyses</span>
                <span className="text-ink">{analysisCount}</span>
              </div>
              <div className="flex justify-between">
                <span>Favorites</span>
                <span className="text-ink">{favorites.length}</span>
              </div>
            </div>
          </motion.div>
        )}
      </nav>

      {/* User */}
      <div className="p-4 border-t border-hairline">
        <div className={cn("flex items-center", isCollapsed ? "justify-center" : "gap-3")}>
          <div className="w-8 h-8 rounded-xs bg-canvas-soft border border-hairline flex items-center justify-center flex-shrink-0">
            <User className="h-4 w-4 text-primary" />
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-body-sm-strong text-ink truncate leading-tight">
                {user?.username || "Guest"}
              </p>
              <p className="text-caption font-mono text-mute">
                {!user?.username || user.username === "guest" ? "Guest Mode" : "PRO USER"}
              </p>
            </div>
          )}
          {!isCollapsed && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={logout}
                title="Log out"
                className="p-1.5 rounded-xs hover:bg-canvas-soft text-mute hover:text-ink transition-colors"
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
