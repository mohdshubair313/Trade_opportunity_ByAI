"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp,
  Menu,
  X,
  ChevronDown,
  User,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ExpandToggle } from "@/components/ui/ExpandToggle";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useStore } from "@/store/useStore";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/pricing", label: "Pricing" },
  {
    label: "Sectors",
    children: [
      { href: "/dashboard?sector=technology", label: "Technology" },
      { href: "/dashboard?sector=pharmaceuticals", label: "Pharmaceuticals" },
      { href: "/dashboard?sector=fintech", label: "Fintech" },
      { href: "/dashboard?sector=healthcare", label: "Healthcare" },
      { href: "/dashboard?sector=renewable-energy", label: "Renewable Energy" },
    ],
  },
];

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const { isAuthenticated, user, logout } = useStore();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-500 ease-in-out",
          isScrolled
            ? "top-3 mx-auto max-w-[95%] lg:max-w-5xl rounded-full bg-[#0d0c17]/85 backdrop-blur-xl border border-white/12 shadow-[0_8px_40px_rgba(0,0,0,0.5)] px-2 sm:px-4"
            : "bg-gradient-to-b from-black/60 to-transparent py-2"
        )}
      >
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="relative">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-400 flex items-center justify-center shadow-[0_0_18px_rgba(168,85,247,0.4)]">
                  <TrendingUp className="h-4 w-4 text-white" strokeWidth={2.5} />
                </div>
                <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-br from-violet-500/40 to-cyan-400/40 blur-md -z-10" />
              </div>
              <span className="font-semibold tracking-tight text-base hidden sm:inline text-white">
                TradeInsight
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) =>
                item.children ? (
                  <div
                    key={item.label}
                    className="relative"
                    onMouseEnter={() => setActiveDropdown(item.label)}
                    onMouseLeave={() => setActiveDropdown(null)}
                  >
                    <button className="flex items-center gap-1 px-4 py-2 text-sm text-white/70 hover:text-white transition-colors">
                      {item.label}
                      <ChevronDown className="h-4 w-4" />
                    </button>
                    <AnimatePresence>
                      {activeDropdown === item.label && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="absolute top-full left-0 w-48 py-2 mt-1 rounded-xl border border-white/10 bg-[#0d0c17]/95 backdrop-blur-xl shadow-[0_12px_40px_rgba(0,0,0,0.5)]"
                        >
                          {item.children.map((child) => (
                            <Link
                              key={child.href}
                              href={child.href}
                              className="block px-4 py-2 text-sm text-white/70 hover:text-white hover:bg-white/[0.06] transition-colors"
                            >
                              {child.label}
                            </Link>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ) : (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="px-4 py-2 text-sm text-white/70 hover:text-white transition-colors"
                  >
                    {item.label}
                  </Link>
                )
              )}
            </nav>

            {/* Right side */}
            <div className="flex items-center gap-3">
              {/* Expand Light/Dark Mode Toggle */}
              <ExpandToggle size="sm" />

              {isAuthenticated ? (
                <div className="hidden md:flex items-center gap-3">
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500/30 to-fuchsia-500/30 flex items-center justify-center ring-1 ring-violet-400/30">
                      <User className="h-4 w-4 text-violet-200" />
                    </div>
                    <span className="text-white/75">
                      {user?.username || "User"}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={logout}
                    className="gap-2 text-white/70 hover:text-white"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </Button>
                </div>
              ) : (
                <div className="hidden md:flex items-center gap-3">
                  <Link href="/login">
                    <Button variant="ghost" size="sm" className="text-white/80 hover:text-white">
                      Sign In
                    </Button>
                  </Link>
                  <Link href="/dashboard">
                    <Button size="sm" className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white shadow-[0_4px_20px_rgba(168,85,247,0.35)] border-none">
                      Get started
                    </Button>
                  </Link>
                </div>
              )}

              {/* Mobile menu button */}
              <button
                className="md:hidden p-2 text-white/80 hover:text-white"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Menu className="h-6 w-6" />
                )}
              </button>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 z-40 md:hidden pt-16"
          >
            <div
              className="absolute inset-0 bg-[#0a0a12]/95 backdrop-blur-2xl"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <nav className="relative p-6 space-y-4">
              {navItems.map((item) =>
                item.children ? (
                  <div key={item.label} className="space-y-2">
                    <div className="text-sm font-semibold text-white/60">
                      {item.label}
                    </div>
                    {item.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        className="block pl-4 py-2 text-white hover:text-violet-300 transition-colors"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                ) : (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="block py-2 text-lg font-medium text-white hover:text-violet-300 transition-colors"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {item.label}
                  </Link>
                )
              )}
              <div className="pt-4 space-y-3 border-t border-white/10">
                {isAuthenticated ? (
                  <Button
                    variant="outline"
                    className="w-full border-white/15 text-white hover:bg-white/[0.06]"
                    onClick={() => {
                      logout();
                      setIsMobileMenuOpen(false);
                    }}
                  >
                    Logout
                  </Button>
                ) : (
                  <>
                    <Link href="/login" onClick={() => setIsMobileMenuOpen(false)}>
                      <Button variant="outline" className="w-full border-white/15 text-white hover:bg-white/[0.06]">
                        Sign In
                      </Button>
                    </Link>
                    <Link href="/dashboard" onClick={() => setIsMobileMenuOpen(false)}>
                      <Button className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 border-none text-white shadow-[0_4px_20px_rgba(168,85,247,0.35)]">
                        Get started
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}