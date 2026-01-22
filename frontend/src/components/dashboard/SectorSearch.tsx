"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Sparkles, TrendingUp, Clock, Star, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { POPULAR_SECTORS } from "@/lib/api";
import { useStore } from "@/store/useStore";

interface SectorSearchProps {
  onSearch: (sector: string) => void;
  isLoading?: boolean;
}

export function SectorSearch({ onSearch, isLoading }: SectorSearchProps) {
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { analysisHistory, favoriteSectors } = useStore();

  const recentSectors = [...new Set(analysisHistory.map((h) => h.sector))].slice(0, 5);

  const filteredSectors = POPULAR_SECTORS.filter((sector) =>
    sector.toLowerCase().includes(query.toLowerCase())
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim() && !isLoading) {
      onSearch(query.trim());
      setQuery("");
      setShowSuggestions(false);
    }
  };

  const handleSelectSector = (sector: string) => {
    if (!isLoading) {
      onSearch(sector);
      setQuery("");
      setShowSuggestions(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative w-full max-w-2xl mx-auto" ref={inputRef}>
      <form onSubmit={handleSubmit}>
        <motion.div
          className={cn(
            "relative flex items-center rounded-2xl border bg-card transition-all duration-300",
            isFocused
              ? "border-primary shadow-lg shadow-primary/20 ring-4 ring-primary/10"
              : "border-border hover:border-muted-foreground/30"
          )}
          animate={{ scale: isFocused ? 1.02 : 1 }}
          transition={{ duration: 0.2 }}
        >
          <Search className="absolute left-5 h-5 w-5 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => {
              setIsFocused(true);
              setShowSuggestions(true);
            }}
            onBlur={() => setIsFocused(false)}
            placeholder="Search any sector... (e.g., Technology, Pharmaceuticals)"
            className="flex h-14 w-full rounded-2xl bg-transparent px-14 py-2 text-base placeholder:text-muted-foreground focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isLoading}
          />
          <AnimatePresence>
            {(query || isLoading) && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                type="submit"
                disabled={isLoading || !query.trim()}
                className="absolute right-3 flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Analyze
                  </>
                )}
              </motion.button>
            )}
          </AnimatePresence>
        </motion.div>
      </form>

      {/* Suggestions Dropdown */}
      <AnimatePresence>
        {showSuggestions && !isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute top-full left-0 right-0 mt-2 rounded-xl border border-border bg-card shadow-xl z-50 overflow-hidden"
          >
            <div className="max-h-[400px] overflow-y-auto p-2">
              {/* Recent searches */}
              {recentSectors.length > 0 && !query && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <Clock className="h-3 w-3" />
                    Recent
                  </div>
                  <div className="space-y-0.5">
                    {recentSectors.map((sector) => (
                      <button
                        key={sector}
                        onClick={() => handleSelectSector(sector)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted transition-colors text-left"
                      >
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>{sector}</span>
                        {favoriteSectors.includes(sector) && (
                          <Star className="h-3 w-3 text-yellow-500 fill-yellow-500 ml-auto" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Favorites */}
              {favoriteSectors.length > 0 && !query && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <Star className="h-3 w-3" />
                    Favorites
                  </div>
                  <div className="space-y-0.5">
                    {favoriteSectors.slice(0, 5).map((sector) => (
                      <button
                        key={sector}
                        onClick={() => handleSelectSector(sector)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted transition-colors text-left"
                      >
                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                        <span>{sector}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Popular sectors */}
              <div>
                <div className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <TrendingUp className="h-3 w-3" />
                  {query ? "Matching Sectors" : "Popular Sectors"}
                </div>
                <div className="space-y-0.5">
                  {(query ? filteredSectors : POPULAR_SECTORS).slice(0, 8).map((sector) => (
                    <button
                      key={sector}
                      onClick={() => handleSelectSector(sector)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted transition-colors text-left group"
                    >
                      <TrendingUp className="h-4 w-4 text-primary" />
                      <span>{sector}</span>
                      <span className="ml-auto text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                        Click to analyze
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
