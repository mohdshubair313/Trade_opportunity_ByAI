"use client";

import { motion } from "framer-motion";
import {
  Activity,
  Bot,
  Cpu,
  Download,
  Gauge,
  Languages,
  Mic,
  MicOff,
  Pause,
  Play,
  Send,
  Sparkles,
  StopCircle,
  TrendingUp,
  Zap,
} from "lucide-react";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConversationPanel, type ConversationTurn } from "@/components/voice/ConversationPanel";
import { CostSavingsBadge } from "@/components/voice/CostSavingsBadge";
import { LiveWaveform } from "@/components/voice/LiveWaveform";
import { VoiceOrb, type VoiceOrbState } from "@/components/voice/VoiceOrb";
import {
  listVoices,
  synthesize,
  voiceQuery,
  VoiceStreamClient,
  type VoiceMode,
  type VoiceOption,
} from "@/lib/voice-client";
import { cn } from "@/lib/utils";

const FALLBACK_VOICES: VoiceOption[] = [
  { value: "aura-2-thalia-en", label: "Thalia (Deepgram)", mood: "Executive & Natural", sample_text: "Namaste, I can track Nifty movements and execute your trades." },
  { value: "aura-2-zeus-en", label: "Zeus (Deepgram)", mood: "Deep & Authoritative", sample_text: "Market trends are showing strong bullish momentum in banking." },
  { value: "nova", label: "Nova (OpenAI)", mood: "Sharp & Responsive", sample_text: "Analyzing Indian equity opportunities and sector valuations." },
  { value: "alloy", label: "Alloy (OpenAI)", mood: "Calm Analyst", sample_text: "Checking Reliance and TCS real-time order books." },
];

const SUGGESTED_PROMPTS = [
  "What is the outlook for Nifty 50 and Bank Nifty today?",
  "Check current price and trends for RELIANCE and TCS.",
  "What is my current portfolio valuation and cash balance?",
  "Which Indian sectors are seeing top institutional momentum?",
];

export type VoiceEngine = "deepgram" | "huggingface_s2s" | "rest";

interface VoiceAgentClientProps {
  defaultSector?: string;
  defaultMode?: VoiceMode;
  className?: string;
  showSavingsCard?: boolean;
}

export function VoiceAgentClient({
  defaultSector,
  defaultMode = "qa",
  className,
  showSavingsCard = true,
}: VoiceAgentClientProps) {
  const [uiState, setUiState] = useState<VoiceOrbState>("idle");
  const [voice, setVoice] = useState("aura-2-thalia-en");
  const [voiceOptions, setVoiceOptions] = useState<VoiceOption[]>(FALLBACK_VOICES);
  const [mode, setMode] = useState<VoiceMode>(defaultMode);
  const [sector, setSector] = useState(defaultSector ?? "");
  const [language, setLanguage] = useState("en");
  const [engine, setEngine] = useState<VoiceEngine>("deepgram");
  const [textInput, setTextInput] = useState("");
  const [turns, setTurns] = useState<ConversationTurn[]>([]);
  const [busy, setBusy] = useState(false);
  const [muted, setMuted] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [activePlaybackId, setActivePlaybackId] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [liveLevel, setLiveLevel] = useState(0);

  const streamRef = useRef<VoiceStreamClient | null>(null);
  const micLevelRef = useRef(0);
  const playbackLevelRef = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Poll live level for smooth reactive 60fps rendering in WebGL Orb
  useEffect(() => {
    let alive = true;
    const tick = () => {
      if (!alive) return;
      const target = uiState === "speaking" ? playbackLevelRef.current : micLevelRef.current;
      setLiveLevel(target);
      animFrameRef.current = requestAnimationFrame(tick);
    };
    animFrameRef.current = requestAnimationFrame(tick);
    return () => {
      alive = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [uiState]);

  useEffect(() => {
    let cancelled = false;
    void listVoices()
      .then((options) => {
        if (cancelled) return;
        if (options.length > 0) {
          setVoiceOptions(options);
          setVoice((prev) => (options.find((o) => o.value === prev) ? prev : options[0].value));
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    const ctx = audioCtxRef.current;
    return () => {
      streamRef.current?.disconnect();
      audio?.pause();
      ctx?.close().catch(() => {});
    };
  }, []);

  const appendTurn = useCallback((turn: ConversationTurn) => {
    setTurns((prev) => [...prev, turn]);
  }, []);

  const handleStreamTranscript = useCallback(
    (role: "user" | "assistant", content: string) => {
      const turn: ConversationTurn = {
        id: `${Date.now()}-${role}`,
        role,
        content,
        createdAt: Date.now(),
      };
      appendTurn(turn);
    },
    [appendTurn]
  );

  const handleOrbClick = async () => {
    if (connected) {
      streamRef.current?.disconnect();
      setConnected(false);
      setUiState("idle");
      return;
    }
    if (busy) return;
    setBusy(true);

    try {
      const wsUrl =
        engine === "huggingface_s2s"
          ? process.env.NEXT_PUBLIC_S2S_WS_URL || "ws://localhost:8765/ws/s2s"
          : process.env.NEXT_PUBLIC_VOICE_WS_URL || "ws://localhost:8765/ws/client";

      const client = new VoiceStreamClient(
        {
          onStateChange: (s) => setUiState(s),
          onTranscript: handleStreamTranscript,
          onMicLevel: (l) => {
            micLevelRef.current = l;
          },
          onPlaybackLevel: (l) => {
            playbackLevelRef.current = l;
          },
          onError: (err) => toast.error(err.message),
          onConnectionChange: (c) => setConnected(c),
        },
        { wsUrl }
      );
      streamRef.current = client;
      await client.connect();
    } catch {
      setUiState("idle");
    } finally {
      setBusy(false);
    }
  };

  const stopPlayback = useCallback(() => {
    audioRef.current?.pause();
    setUiState(connected ? "listening" : "idle");
    setActivePlaybackId(null);
  }, [connected]);

  const handleSendText = async (customPrompt?: string) => {
    const queryText = (customPrompt ?? textInput).trim();
    if (!queryText || busy) return;
    if (!customPrompt) setTextInput("");

    appendTurn({
      id: `${Date.now()}-user-text`,
      role: "user",
      content: queryText,
      createdAt: Date.now(),
    });

    try {
      setBusy(true);
      setUiState("thinking");
      const result = await voiceQuery({
        prompt: queryText,
        sector: sector.trim() || undefined,
        mode,
        voice,
        history: turns.slice(-6).map((t) => ({
          role: t.role === "system" ? ("user" as const) : (t.role as "user" | "assistant"),
          content: t.content,
        })),
      });
      const { transcript } = result;
      if (transcript.assistant_text) {
        const assistantTurn: ConversationTurn = {
          id: `${Date.now()}-assistant`,
          role: "assistant",
          content: transcript.assistant_text,
          audioUrl: result.audio_base64
            ? `data:${result.audio_format || "audio/mp3"};base64,${result.audio_base64}`
            : undefined,
          cacheHit: result.cache_hit,
          provider: result.provider ?? undefined,
          latencyMs: result.latency_ms,
          createdAt: Date.now(),
        };
        appendTurn(assistantTurn);

        if (autoSpeak && assistantTurn.audioUrl && !muted) {
          const audio = audioRef.current;
          if (audio) {
            audio.src = assistantTurn.audioUrl;
            setActivePlaybackId(assistantTurn.id);
            setUiState("speaking");
            await attachPlaybackAnalyser(audio, audioCtxRef, analyserRef, playbackLevelRef, sourceRef);
            await audio.play();
          }
        } else {
          setUiState(connected ? "listening" : "idle");
        }
      } else {
        setUiState(connected ? "listening" : "idle");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Query failed");
      setUiState(connected ? "listening" : "idle");
    } finally {
      setBusy(false);
    }
  };

  const handleSampleVoice = async () => {
    const target = voiceOptions.find((v) => v.value === voice);
    if (!target?.sample_text) return;
    try {
      setBusy(true);
      setUiState("thinking");
      const synth = await synthesize({
        text: target.sample_text,
        voice,
        responseFormat: "mp3",
      });
      const turn: ConversationTurn = {
        id: `${Date.now()}-sample`,
        role: "assistant",
        content: target.sample_text,
        audioUrl: synth.audioUrl,
        cacheHit: synth.cacheHit,
        provider: synth.provider,
        latencyMs: synth.latencyMs,
        createdAt: Date.now(),
      };
      appendTurn(turn);
      const audio = audioRef.current;
      if (audio) {
        audio.src = synth.audioUrl;
        setActivePlaybackId(turn.id);
        setUiState("speaking");
        await attachPlaybackAnalyser(audio, audioCtxRef, analyserRef, playbackLevelRef, sourceRef);
        await audio.play();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sample failed");
      setUiState("idle");
    } finally {
      setBusy(false);
    }
  };

  const handleDownload = () => {
    const lastAssistant = [...turns].reverse().find((t) => t.role === "assistant" && t.audioUrl);
    if (!lastAssistant?.audioUrl) {
      toast("No assistant audio yet to download.", { icon: "🎧" });
      return;
    }
    const a = document.createElement("a");
    a.href = lastAssistant.audioUrl;
    a.download = `tradeinsight_voice_${lastAssistant.id}.mp3`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const orbState: VoiceOrbState = muted ? "muted" : uiState;
  const lastAssistant = useMemo(
    () => [...turns].reverse().find((t) => t.role === "assistant"),
    [turns]
  );

  return (
    <section className={cn("grid gap-6 xl:grid-cols-[1.1fr_0.9fr]", className)}>
      {/* Left Column: Interactive 3D Orb, Stream Waveform & Voice Controls */}
      <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(34,197,94,0.18),transparent_30%),linear-gradient(180deg,rgba(7,10,14,0.98),rgba(8,13,18,0.95))] p-6 shadow-[0_30px_120px_rgba(0,0,0,0.32)]">
        <div className="absolute inset-0 bg-[linear-gradient(115deg,transparent,rgba(255,255,255,0.04),transparent)] opacity-40 pointer-events-none" />

        <div className="relative">
          {/* Header Bar */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <Badge variant="glow">
                  <Sparkles className="mr-1 h-3 w-3" />
                  Voice Agent
                </Badge>
                <Badge variant="outline" className="border-emerald-500/30 text-emerald-300">
                  <Activity className="mr-1 h-3 w-3 animate-pulse text-emerald-400" />
                  {connected
                    ? engine === "huggingface_s2s"
                      ? "HF Speech-to-Speech Streaming"
                      : "Deepgram Agent Streaming"
                    : "Ready to Connect"}
                </Badge>
              </div>
              <h3 className="text-2xl font-semibold [font-family:var(--font-display)] text-white">
                Conversational Market Intelligence
              </h3>
              <p className="mt-1 max-w-xl text-sm text-slate-300">
                {connected
                  ? "Speak naturally. Real-time Indian market insights, stock quotes, and mock trading."
                  : "Tap the 3D Aura Orb or press Start to initiate live bidirectional voice streaming."}
              </p>
            </div>
            <CostSavingsBadge variant="compact" />
          </div>

          {/* Main Stage: 3D Aura Orb + Audio Waveform */}
          <div className="grid gap-6 lg:grid-cols-[auto_1fr] items-center">
            <div className="flex flex-col items-center">
              <button
                type="button"
                onClick={() => void handleOrbClick()}
                disabled={busy && uiState !== "speaking"}
                className="group rounded-full focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-400/50"
                aria-label={connected ? "Disconnect Voice Session" : "Start Live Voice Session"}
              >
                <VoiceOrb
                  state={orbState}
                  level={liveLevel}
                  size={270}
                  className="transition-transform duration-300 group-hover:scale-[1.03]"
                />
              </button>

              <div className="mt-3 flex items-center gap-2 text-xs">
                <span
                  className={cn(
                    "rounded-full border px-3 py-1 font-medium transition-colors",
                    connected
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                      : "border-white/10 bg-white/5 text-slate-400"
                  )}
                >
                  {!connected
                    ? "Tap orb to connect"
                    : uiState === "listening"
                    ? "Listening — speak naturally"
                    : uiState === "speaking"
                    ? "Agent speaking — tap to interrupt"
                    : uiState === "thinking"
                    ? "Synthesizing market response…"
                    : "Streaming connected"}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              {/* Waveform Card */}
              <div className="rounded-3xl border border-white/10 bg-black/30 p-4 backdrop-blur-sm">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs uppercase tracking-[0.2em] text-emerald-300/90 font-semibold">
                    Acoustic Harmonic Stream
                  </span>
                  <span className="text-xs text-slate-400">
                    {uiState === "speaking" ? "Voice Output" : "Microphone Input"}
                  </span>
                </div>
                <LiveWaveform
                  active={uiState === "listening" || uiState === "speaking"}
                  getLevel={() => liveLevel}
                  height={80}
                  bars={64}
                  color={uiState === "speaking" ? "cyan" : "emerald"}
                />
              </div>

              {/* Engine & Configuration Pills */}
              <div className="grid gap-3 sm:grid-cols-2">
                <ControlPill icon={<Bot className="h-3.5 w-3.5" />} label="Voice Engine">
                  <select
                    value={engine}
                    onChange={(e) => setEngine(e.target.value as VoiceEngine)}
                    className="w-full bg-transparent text-sm text-white outline-none cursor-pointer"
                  >
                    <option value="deepgram" className="bg-slate-950">Deepgram Voice Agent (Nova-3)</option>
                    <option value="huggingface_s2s" className="bg-slate-950">HuggingFace S2S Pipeline</option>
                    <option value="rest" className="bg-slate-950">Cached REST Pipeline</option>
                  </select>
                </ControlPill>

                <ControlPill icon={<Mic className="h-3.5 w-3.5" />} label="Persona / Voice">
                  <select
                    value={voice}
                    onChange={(e) => setVoice(e.target.value)}
                    className="w-full bg-transparent text-sm text-white outline-none cursor-pointer"
                  >
                    {voiceOptions.map((opt) => (
                      <option key={opt.value} value={opt.value} className="bg-slate-950">
                        {opt.label} • {opt.mood}
                      </option>
                    ))}
                  </select>
                </ControlPill>

                <ControlPill icon={<Gauge className="h-3.5 w-3.5" />} label="Conversation Mode">
                  <select
                    value={mode}
                    onChange={(e) => setMode(e.target.value as VoiceMode)}
                    className="w-full bg-transparent text-sm text-white outline-none cursor-pointer"
                  >
                    <option value="qa" className="bg-slate-950">Direct Q&amp;A (Fastest)</option>
                    <option value="briefing" className="bg-slate-950">Sector Briefing (Deep)</option>
                    <option value="open" className="bg-slate-950">Open Market Exploration</option>
                  </select>
                </ControlPill>

                <ControlPill icon={<Languages className="h-3.5 w-3.5" />} label="Language / Hinglish">
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full bg-transparent text-sm text-white outline-none cursor-pointer"
                  >
                    <option value="en" className="bg-slate-950">Indian English</option>
                    <option value="hinglish" className="bg-slate-950">Hinglish (Hindi+English)</option>
                    <option value="hi" className="bg-slate-950">Hindi</option>
                  </select>
                </ControlPill>

                <ControlPill icon={<Sparkles className="h-3.5 w-3.5" />} label="Sector Focus">
                  <input
                    value={sector}
                    onChange={(e) => setSector(e.target.value)}
                    placeholder="e.g. Renewable Energy, Banking"
                    className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
                  />
                </ControlPill>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Button
                  variant={muted ? "outline" : "ghost"}
                  size="sm"
                  onClick={() => {
                    setMuted((m) => !m);
                    streamRef.current?.toggleMute();
                  }}
                >
                  {muted ? <MicOff className="h-4 w-4 text-rose-400" /> : <Mic className="h-4 w-4" />}
                  {muted ? "Muted" : "Mic Live"}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setAutoSpeak((s) => !s)}>
                  {autoSpeak ? <Play className="h-4 w-4 text-emerald-400" /> : <Pause className="h-4 w-4" />}
                  Auto-speak {autoSpeak ? "On" : "Off"}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => void handleSampleVoice()} disabled={busy}>
                  <Zap className="h-4 w-4 text-amber-300" />
                  Test Voice
                </Button>
                <Button variant="ghost" size="sm" onClick={handleDownload} disabled={!lastAssistant?.audioUrl}>
                  <Download className="h-4 w-4" />
                  Download Audio
                </Button>
                {uiState === "speaking" && (
                  <Button variant="outline" size="sm" onClick={stopPlayback}>
                    <StopCircle className="h-4 w-4 text-rose-400" />
                    Stop Speech
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Quick Financial Prompt Chips */}
          <div className="mt-6">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-400 mb-2 flex items-center gap-1.5 font-medium">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
              Suggested Market Inquiries
            </p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_PROMPTS.map((promptText) => (
                <button
                  key={promptText}
                  type="button"
                  onClick={() => void handleSendText(promptText)}
                  disabled={busy}
                  className="rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-xs text-slate-300 transition-all hover:border-emerald-400/40 hover:bg-emerald-400/10 hover:text-white disabled:opacity-50"
                >
                  {promptText}
                </button>
              ))}
            </div>
          </div>

          {/* Text Input Fallback Bar */}
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-5 flex items-center gap-3 rounded-3xl border border-white/10 bg-black/30 p-2.5 shadow-inner"
          >
            <input
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void handleSendText();
                }
              }}
              placeholder="Type a trading question or command (e.g. 'Price of Reliance', 'Buy 5 TCS')..."
              className="flex-1 bg-transparent px-3 py-2 text-sm text-white outline-none placeholder:text-slate-500"
            />
            <Button
              variant="glow"
              size="sm"
              onClick={() => void handleSendText()}
              disabled={busy || !textInput.trim()}
            >
              Send <Send className="h-4 w-4" />
            </Button>
          </motion.div>
        </div>
      </div>

      {/* Right Column: Live Turn Transcript, Tool Execution & Cost Metrics */}
      <div className="flex flex-col gap-4">
        <ConversationPanel
          turns={turns}
          onPlayAudio={(turn) => {
            if (activePlaybackId === turn.id && uiState === "speaking") {
              stopPlayback();
            } else if (turn.audioUrl) {
              const audio = audioRef.current;
              if (audio) {
                audio.src = turn.audioUrl;
                setActivePlaybackId(turn.id);
                setUiState("speaking");
                void attachPlaybackAnalyser(audio, audioCtxRef, analyserRef, playbackLevelRef, sourceRef);
                void audio.play();
              }
            }
          }}
        />

        {showSavingsCard && <CostSavingsBadge variant="full" />}

        {/* Feature Highlights */}
        <div className="rounded-3xl border border-white/10 bg-[linear-gradient(180deg,rgba(7,10,14,0.85),rgba(8,13,18,0.95))] p-5 text-sm text-slate-300">
          <div className="mb-3 flex items-center gap-2 font-medium text-white">
            <Cpu className="h-4 w-4 text-emerald-400" />
            Voice Intelligence Capabilities
          </div>
          <ul className="space-y-2 text-sm leading-6 text-slate-300">
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 font-bold">•</span>
              <span><strong>Deepgram Agent + HF Speech-to-Speech:</strong> Ultra-low latency turn-taking, barge-in detection, and real-time streaming speech synthesis.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 font-bold">•</span>
              <span><strong>Tool Execution Engine:</strong> Live pricing for Indian stocks (NSE/BSE), crypto, portfolio balance lookups, and mock trade orders.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 font-bold">•</span>
              <span><strong>Hinglish Fluency:</strong> Natural understanding of Hindi-English financial slang (bhaav, kharidna, bechna, girawat).</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 font-bold">•</span>
              <span><strong>Cost-Aware Caching:</strong> Common questions and briefings hit local disk audio cache at zero API cost.</span>
            </li>
          </ul>
        </div>
      </div>

      <audio
        ref={audioRef}
        onPlay={() => setUiState("speaking")}
        onEnded={() => {
          setUiState(connected ? "listening" : "idle");
          setActivePlaybackId(null);
        }}
        onPause={() => {
          if (uiState === "speaking" && !connected) setUiState("idle");
        }}
        className="hidden"
      />
    </section>
  );
}

interface ControlPillProps {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}

function ControlPill({ icon, label, children }: ControlPillProps) {
  return (
    <label className="rounded-2xl border border-white/10 bg-white/5 p-3 block">
      <span className="mb-1.5 flex items-center gap-1.5 text-xs uppercase tracking-[0.16em] text-slate-400 font-medium">
        {icon}
        {label}
      </span>
      <div>{children}</div>
    </label>
  );
}

async function attachPlaybackAnalyser(
  audio: HTMLAudioElement,
  ctxRef: React.MutableRefObject<AudioContext | null>,
  analyserRef: React.MutableRefObject<AnalyserNode | null>,
  levelRef: React.MutableRefObject<number>,
  sourceRef: React.MutableRefObject<MediaElementAudioSourceNode | null>
) {
  if (!ctxRef.current) {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctxRef.current = new Ctx();
  }
  if (sourceRef.current) {
    try {
      sourceRef.current.disconnect();
    } catch {}
    sourceRef.current = null;
  }
  if (!analyserRef.current) {
    const analyser = ctxRef.current.createAnalyser();
    analyser.fftSize = 1024;
    analyserRef.current = analyser;
    analyser.connect(ctxRef.current.destination);
  }
  try {
    const source = ctxRef.current.createMediaElementSource(audio);
    source.connect(analyserRef.current!);
    sourceRef.current = source;
  } catch {}

  const data = new Uint8Array(analyserRef.current!.fftSize);
  const tick = () => {
    if (!analyserRef.current) return;
    analyserRef.current.getByteTimeDomainData(data);
    let sumSq = 0;
    for (let i = 0; i < data.length; i += 1) {
      const v = (data[i] - 128) / 128;
      sumSq += v * v;
    }
    levelRef.current = Math.sqrt(sumSq / data.length);
    if (!audio.paused && !audio.ended) {
      requestAnimationFrame(tick);
    } else {
      levelRef.current = 0;
    }
  };
  requestAnimationFrame(tick);
}
