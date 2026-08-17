"use client";

import { motion } from "framer-motion";
import {
  Activity,
  ArrowRight,
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
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  { value: "nova", label: "Nova", mood: "Executive and balanced", sample_text: "" },
  { value: "alloy", label: "Alloy", mood: "Calm analyst", sample_text: "" },
  { value: "onyx", label: "Onyx", mood: "Deep command-room tone", sample_text: "" },
  { value: "sage", label: "Sage", mood: "Measured and premium", sample_text: "" },
];

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
  const [voice, setVoice] = useState("nova");
  const [voiceOptions, setVoiceOptions] = useState<VoiceOption[]>(FALLBACK_VOICES);
  const [mode, setMode] = useState<VoiceMode>(defaultMode);
  const [sector, setSector] = useState(defaultSector ?? "");
  const [language, setLanguage] = useState("en");
  const [textInput, setTextInput] = useState("");
  const [turns, setTurns] = useState<ConversationTurn[]>([]);
  const [busy, setBusy] = useState(false);
  const [muted, setMuted] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [activePlaybackId, setActivePlaybackId] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);

  const streamRef = useRef<VoiceStreamClient | null>(null);
  const micLevelRef = useRef(0);
  const playbackLevelRef = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);

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
      return;
    }
    if (busy) return;
    setBusy(true);
    try {
      const client = new VoiceStreamClient({
        onStateChange: (s) => setUiState(s),
        onTranscript: handleStreamTranscript,
        onMicLevel: (l) => { micLevelRef.current = l; },
        onPlaybackLevel: (l) => { playbackLevelRef.current = l; },
        onError: (err) => toast.error(err.message),
        onConnectionChange: (c) => setConnected(c),
      });
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

  const handleSendText = async () => {
    const trimmed = textInput.trim();
    if (!trimmed || busy) return;
    setTextInput("");
    appendTurn({
      id: `${Date.now()}-user-text`,
      role: "user",
      content: trimmed,
      createdAt: Date.now(),
    });
    try {
      setBusy(true);
      setUiState("thinking");
      const result = await voiceQuery({
        prompt: trimmed,
        sector: sector.trim() || undefined,
        mode,
        voice,
        history: turns.slice(-6).map((t) => ({
          role: t.role === "system" ? "user" as const : t.role as "user" | "assistant",
          content: t.content,
        })),
      });
      const { transcript } = result;
      if (transcript.assistant_text) {
        appendTurn({
          id: `${Date.now()}-assistant`,
          role: "assistant",
          content: transcript.assistant_text,
          createdAt: Date.now(),
        });
      }
      if (!autoSpeak || muted) {
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
        try {
          await attachPlaybackAnalyser(audio, audioCtxRef, analyserRef, playbackLevelRef, sourceRef);
          await audio.play();
        } catch {
          setUiState("idle");
          setActivePlaybackId(null);
        }
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
    <section className={cn("grid gap-6 xl:grid-cols-[1fr_0.95fr]", className)}>
      <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(34,197,94,0.18),transparent_30%),linear-gradient(180deg,rgba(7,10,14,0.98),rgba(8,13,18,0.95))] p-6 shadow-[0_30px_120px_rgba(0,0,0,0.28)]">
        <div className="absolute inset-0 bg-[linear-gradient(115deg,transparent,rgba(255,255,255,0.05),transparent)] opacity-40" />

        <div className="relative">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <Badge variant="glow">
                  <Sparkles className="mr-1 h-3 w-3" />
                  Voice Agent
                </Badge>
                <Badge variant="outline">
                  <Activity className="mr-1 h-3 w-3" />
                  {connected ? "Real-time streaming" : "Real-time conversational AI"}
                </Badge>
              </div>
              <h3 className="text-2xl font-semibold [font-family:var(--font-display)]">
                Talk to your market intelligence
              </h3>
              <p className="mt-2 max-w-xl text-sm text-slate-300">
                {connected
                  ? "Streaming — speak naturally. The agent listens and responds in real time."
                  : "Click the orb to start a real-time voice conversation. Type a question below to use text."}
              </p>
            </div>
            <CostSavingsBadge variant="compact" />
          </div>

          <div className="grid gap-6 lg:grid-cols-[auto_1fr]">
            <div className="grid place-items-center">
              <button
                type="button"
                onClick={() => void handleOrbClick()}
                disabled={busy && uiState !== "speaking"}
                className="group rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
                aria-label={
                  connected
                    ? "Disconnect"
                    : "Start conversation"
                }
              >
                <VoiceOrb
                  state={orbState}
                  level={uiState === "speaking" ? playbackLevelRef.current : micLevelRef.current}
                  size={260}
                  className="transition-transform group-hover:scale-[1.02] group-active:scale-[0.98]"
                />
              </button>
              <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                  {!connected
                    ? "Tap orb to connect"
                    : uiState === "listening"
                    ? "Listening — speak naturally"
                    : uiState === "speaking"
                    ? "Speaking — tap to stop"
                    : uiState === "thinking"
                    ? "Thinking…"
                    : "Connected"}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs uppercase tracking-[0.2em] text-emerald-200/80">
                    Live waveform
                  </p>
                  <span className="text-xs text-slate-400">
                    {uiState === "speaking" ? "Playback" : "Mic input"}
                  </span>
                </div>
                <LiveWaveform
                  active={uiState === "listening" || uiState === "speaking"}
                  getLevel={() =>
                    uiState === "speaking" ? playbackLevelRef.current : micLevelRef.current
                  }
                  height={88}
                  bars={72}
                  color={uiState === "speaking" ? "cyan" : "emerald"}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <ControlPill icon={<Mic className="h-3.5 w-3.5" />} label="Voice">
                  <select
                    value={voice}
                    onChange={(e) => setVoice(e.target.value)}
                    className="w-full bg-transparent text-sm text-white outline-none"
                  >
                    {voiceOptions.map((opt) => (
                      <option key={opt.value} value={opt.value} className="bg-slate-950">
                        {opt.label} • {opt.mood}
                      </option>
                    ))}
                  </select>
                </ControlPill>
                <ControlPill icon={<Gauge className="h-3.5 w-3.5" />} label="Mode">
                  <select
                    value={mode}
                    onChange={(e) => setMode(e.target.value as VoiceMode)}
                    className="w-full bg-transparent text-sm text-white outline-none"
                  >
                    <option value="qa" className="bg-slate-950">Q&amp;A — short, direct</option>
                    <option value="briefing" className="bg-slate-950">Briefing — full sector</option>
                    <option value="open" className="bg-slate-950">Open — exploratory</option>
                  </select>
                </ControlPill>
                <ControlPill icon={<Languages className="h-3.5 w-3.5" />} label="Language hint">
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full bg-transparent text-sm text-white outline-none"
                  >
                    <option value="en" className="bg-slate-950">English</option>
                    <option value="hi" className="bg-slate-950">Hindi</option>
                    <option value="hinglish" className="bg-slate-950">Hinglish</option>
                  </select>
                </ControlPill>
                <ControlPill icon={<Sparkles className="h-3.5 w-3.5" />} label="Sector focus">
                  <input
                    value={sector}
                    onChange={(e) => setSector(e.target.value)}
                    placeholder="e.g. Renewable Energy"
                    className="w-full bg-transparent text-sm text-white outline-none"
                  />
                </ControlPill>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant={muted ? "outline" : "ghost"}
                  size="sm"
                  onClick={() => {
                    setMuted((m) => !m);
                    streamRef.current?.toggleMute();
                  }}
                >
                  {muted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  {muted ? "Muted" : "Live"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setAutoSpeak((s) => !s)}
                >
                  {autoSpeak ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                  Auto-speak {autoSpeak ? "on" : "off"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => void handleSampleVoice()}
                  disabled={busy}
                >
                  <Zap className="h-4 w-4" />
                  Sample voice
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDownload}
                  disabled={!lastAssistant?.audioUrl}
                >
                  <Download className="h-4 w-4" />
                  Download
                </Button>
                {uiState === "speaking" && connected && (
                  <Button variant="outline" size="sm" onClick={stopPlayback}>
                    <StopCircle className="h-4 w-4" />
                    Stop
                  </Button>
                )}
              </div>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 flex items-center gap-3 rounded-3xl border border-white/10 bg-black/30 p-3"
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
              placeholder="Type a question if you'd rather not speak…"
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
        <div className="rounded-3xl border border-white/10 bg-[linear-gradient(180deg,rgba(7,10,14,0.85),rgba(8,13,18,0.95))] p-5 text-sm text-slate-300">
          <div className="mb-3 flex items-center gap-2 text-white">
            <ArrowRight className="h-4 w-4 text-emerald-300" />
            What this voice agent does for you
          </div>
          <ul className="space-y-2 text-sm leading-6">
            <li>• Answers spoken or typed questions about Indian equity sectors.</li>
            <li>• Cited replies — numbers come from the same agentic research pipeline that powers your reports.</li>
            <li>• Cached TTS — repeated phrases play back instantly with no upstream cost.</li>
            <li>• Silence-aware — pauses, breathing, and dead air get trimmed before transcription.</li>
            <li>• Provider arbitrage — auto-routes to the fastest healthy AI provider every turn.</li>
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
    <label className="rounded-2xl border border-white/10 bg-white/5 p-3">
      <span className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-slate-400">
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
  // Disconnect existing source if it's attached to a different audio element
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
  // Create new source for this audio element
  const source = ctxRef.current.createMediaElementSource(audio);
  source.connect(analyserRef.current!);
  sourceRef.current = source;
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
