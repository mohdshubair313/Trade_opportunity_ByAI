"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Menu,
  X,
  ChevronDown,
  User,
  LogOut,
  ArrowRight,
  Sun,
  Moon,
} from "lucide-react";
import { LogoGlyph } from "@/components/icons/CustomIcons";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useStore } from "@/store/useStore";
import { useTheme } from "@/components/ui/ThemeProvider";

const navItems = [
  { href: "#product", label: "Product" },
  {
    label: "Sectors",
    children: [
      { href: "/dashboard?sector=technology", label: "Technology (IT)" },
      { href: "/dashboard?sector=pharmaceuticals", label: "Pharma & CDMO" },
      { href: "/dashboard?sector=fintech", label: "Fintech & Payments" },
      { href: "/dashboard?sector=renewable-energy", label: "Renewables & CleanTech" },
      { href: "/dashboard?sector=automotive", label: "Automotive & EV" },
      { href: "/dashboard?sector=banking", label: "Banking & BFSI" },
    ],
  },
  { href: "/pricing", label: "Pricing" },
];

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const { isAuthenticated, user, logout } = useStore();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 40);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      <motion.header
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
          isScrolled
            ? "py-3 bg-background/90 backdrop-blur-xl border-b border-border shadow-[0_8px_32px_rgba(0,0,0,0.1)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
            : "py-5 bg-gradient-to-b from-background/90 to-transparent"
        )}
      >
        <div className="main-container mx-auto">
          <div className="flex items-center justify-between">
            {/* Logo: Bespoke IconsRoom Glyph + Wordmark with Kalam font badge */}
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-card border border-border text-primary group-hover:border-primary/50 group-hover:shadow-[0_0_16px_rgba(217,119,87,0.2)] dark:group-hover:shadow-[0_0_16px_rgba(31,224,168,0.3)] transition-all">
                <LogoGlyph className="h-4 w-4" />
                <span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold tracking-tight text-base text-foreground group-hover:text-primary transition-colors">
                  TradeInsight
                </span>
                <span className="font-kalam text-xs text-primary font-bold tracking-wide">
                  ai
                </span>
              </div>
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
                    <button className="flex items-center gap-1.5 px-3.5 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-card">
                      {item.label}
                      <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                    </button>
                    <AnimatePresence>
                      {activeDropdown === item.label && (
                        <motion.div
                          initial={{ opacity: 0, y: 8, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 8, scale: 0.98 }}
                          transition={{ duration: 0.15 }}
                          className="absolute top-full left-0 w-52 py-2 mt-1 rounded-xl border border-border bg-card/95 backdrop-blur-xl shadow-xl"
                        >
                          <div className="px-3 py-1 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                            Covered Sectors
                          </div>
                          {item.children.map((child) => (
                            <Link
                              key={child.href}
                              href={child.href}
                              className="block px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
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
                    className="px-3.5 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-card"
                  >
                    {item.label}
                  </Link>
                )
              )}
            </nav>

            {/* Right Action Buttons */}
            <div className="flex items-center gap-3">
              {/* Theme Toggle Button (Light Parchment vs Dark Terminal) */}
              <button
                onClick={toggleTheme}
                aria-label="Toggle theme"
                className="p-2 rounded-lg border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                title={theme === "dark" ? "Switch to Claude Light Parchment Mode" : "Switch to Dark Terminal Mode"}
              >
                {theme === "dark" ? (
                  <Sun className="h-4 w-4 text-[#E8A33D]" />
                ) : (
                  <Moon className="h-4 w-4 text-[#d97757]" />
                )}
              </button>

              {isAuthenticated ? (
                <div className="hidden md:flex items-center gap-3">
                  <Link
                    href="/dashboard"
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card border border-border text-xs text-foreground hover:border-primary/40 transition-colors"
                  >
                    <div className="w-5 h-5 rounded-full bg-primary/15 flex items-center justify-center text-primary">
                      <User className="h-3 w-3" />
                    </div>
                    <span className="font-mono text-foreground">
                      {user?.username || "Terminal"}
                    </span>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={logout}
                    className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Exit
                  </Button>
                </div>
              ) : (
                <div className="hidden md:flex items-center gap-3">
                  <Link href="/login">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-transparent"
                    >
                      Log in
                    </Button>
                  </Link>
                  <Link href="/dashboard">
                    <Button
                      size="sm"
                      className="h-9 px-4 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold tracking-tight shadow-md transition-all"
                    >
                      <span>Ask the market</span>
                      <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </div>
              )}

              {/* Mobile Menu Toggle */}
              <button
                className="md:hidden p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-card"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                aria-label="Toggle menu"
              >
                {isMobileMenuOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Mobile Menu Drawer */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 z-40 md:hidden pt-20"
          >
            <div
              className="absolute inset-0 bg-background/95 backdrop-blur-2xl"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <nav className="relative p-6 space-y-4 max-w-sm mx-auto">
              {navItems.map((item) =>
                item.children ? (
                  <div key={item.label} className="space-y-2 py-2">
                    <div className="text-xs font-mono font-medium text-muted-foreground uppercase tracking-wider">
                      {item.label}
                    </div>
                    {item.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        className="block pl-3 py-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
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
                    className="block py-2 text-base font-medium text-foreground hover:text-primary transition-colors"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {item.label}
                  </Link>
                )
              )}
              <div className="pt-6 space-y-3 border-t border-border">
                {isAuthenticated ? (
                  <Button
                    variant="outline"
                    className="w-full border-border text-foreground hover:bg-muted"
                    onClick={() => {
                      logout();
                      setIsMobileMenuOpen(false);
                    }}
                  >
                    Log out
                  </Button>
                ) : (
                  <>
                    <Link
                      href="/login"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="block"
                    >
                      <Button
                        variant="outline"
                        className="w-full border-border text-foreground hover:bg-muted"
                      >
                        Log in
                      </Button>
                    </Link>
                    <Link
                      href="/dashboard"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="block"
                    >
                      <Button className="w-full rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-md">
                        Ask the market
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