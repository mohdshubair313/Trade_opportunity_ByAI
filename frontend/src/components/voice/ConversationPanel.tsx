"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Bot, Sparkles, User2, Volume2, Zap } from "lucide-react";
import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

export interface ConversationTurn {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  audioUrl?: string | null;
  cacheHit?: boolean;
  provider?: string | null;
  latencyMs?: number;
  createdAt: number;
}

interface ConversationPanelProps {
  turns: ConversationTurn[];
  className?: string;
  onPlayAudio?: (turn: ConversationTurn) => void;
}

/**
 * Sleek conversation transcript — assistant turns can be replayed without
 * re-synthesising thanks to the voice cache. We surface the cache-hit
 * badge inline so the user sees the cost optimisation at a glance.
 */
export function ConversationPanel({ turns, className, onPlayAudio }: ConversationPanelProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [turns.length]);

  return (
    <div
      ref={scrollRef}
      className={cn(
        "max-h-[520px] overflow-y-auto rounded-3xl border border-white/10 bg-[linear-gradient(180deg,rgba(7,10,14,0.85),rgba(8,13,18,0.95))] p-5",
        className
      )}
    >
      {turns.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {turns.map((turn) => (
              <motion.div
                key={turn.id}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={cn(
                  "flex gap-3",
                  turn.role === "user" ? "flex-row-reverse" : "flex-row"
                )}
              >
                <div
                  className={cn(
                    "grid h-9 w-9 flex-shrink-0 place-items-center rounded-2xl border",
                    turn.role === "user"
                      ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
                      : "border-cyan-400/30 bg-cyan-400/10 text-cyan-200"
                  )}
                >
                  {turn.role === "user" ? <User2 className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                </div>
                <div
                  className={cn(
                    "max-w-[78%] rounded-3xl border px-4 py-3 text-sm leading-6",
                    turn.role === "user"
                      ? "border-emerald-400/20 bg-emerald-400/5 text-emerald-50"
                      : "border-white/10 bg-white/5 text-slate-100"
                  )}
                >
                  <p className="whitespace-pre-wrap">{turn.content}</p>
                  {turn.role === "assistant" && (
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                      {turn.cacheHit ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-emerald-200">
                          <Zap className="h-3 w-3" /> Cache hit · 0 ms
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2 py-0.5 text-cyan-100">
                          <Sparkles className="h-3 w-3" />
                          Fresh · {turn.provider ?? "ai"}
                          {turn.latencyMs ? ` · ${turn.latencyMs} ms` : ""}
                        </span>
                      )}
                      {turn.audioUrl && onPlayAudio && (
                        <button
                          type="button"
                          onClick={() => onPlayAudio(turn)}
                          className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-2 py-0.5 transition hover:border-white/30 hover:bg-white/10 hover:text-white"
                        >
                          <Volume2 className="h-3 w-3" /> Replay
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="grid place-items-center py-12 text-center">
      <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl border border-emerald-400/30 bg-emerald-400/10">
        <Sparkles className="h-6 w-6 text-emerald-300" />
      </div>
      <h4 className="text-lg font-semibold text-white">Tap the orb to start a voice conversation</h4>
      <p className="mt-2 max-w-xs text-sm text-slate-400">
        Ask about a sector, a stock, or a market move. The agent listens, reasons, and speaks back —
        with cached responses costing nothing on repeat.
      </p>
    </div>
  );
}
