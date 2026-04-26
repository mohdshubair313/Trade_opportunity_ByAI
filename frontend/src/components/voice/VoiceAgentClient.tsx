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
import toast from "react-hot-toast";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConversationPanel, type ConversationTurn } from "@/components/voice/ConversationPanel";
import { CostSavingsBadge } from "@/components/voice/CostSavingsBadge";
import { LiveWaveform } from "@/components/voice/LiveWaveform";
import { VoiceOrb, type VoiceOrbState } from "@/components/voice/VoiceOrb";
import {
  listVoices,
  startRecording,
  synthesize,
  turnAudioUrl,
  voiceAgentTurn,
  voiceQuery,
  type RecorderHandle,
  type VoiceMode,
  type VoiceOption,
  type VoiceTurnResult,
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

/**
 * The full voice agent surface — orb + waveform + transcript + sample-test.
 *
 * Wires the recorder, REST helpers, and visualisations into one cohesive
 * client component. It keeps four pieces of state in sync:
 *
 * - `state` (idle | listening | thinking | speaking | muted) — drives both
 *   the orb animation and the waveform's `active` flag.
 * - `levelRef` — a ref polled by the canvas widgets for 60fps amplitude.
 * - `turns` — the running transcript, used for context on the next turn
 *   and rendered in the conversation panel.
 * - `audioRef` — the single <audio> element. We reuse it across turns so
 *   "Stop speaking" and "Replay" both work without object-URL churn.
 */
export function VoiceAgentClient({
  defaultSector,
  defaultMode = "qa",
  className,
  showSavingsCard = true,
}: VoiceAgentClientProps) {
  const [state, setState] = useState<VoiceOrbState>("idle");
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

  const recorderRef = useRef<RecorderHandle | null>(null);
  const levelRef = useRef(0);
  const playbackLevelRef = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  // Pull the curated voice list from the backend; fall back gracefully.
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
      .catch(() => {
        // backend offline → keep fallback voices
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    const ctx = audioCtxRef.current;
    return () => {
      recorderRef.current?.cancel();
      audio?.pause();
      ctx?.close().catch(() => {});
    };
  }, []);

  const conversationContext = useMemo(
    () =>
      turns.slice(-6).map((turn) => ({
        role: turn.role === "system" ? ("user" as const) : (turn.role as "user" | "assistant"),
        content: turn.content,
      })),
    [turns]
  );

  const playTurn = useCallback(
    async (turn: ConversationTurn) => {
      if (!turn.audioUrl) return;
      const audio = audioRef.current;
      if (!audio) return;
      audio.src = turn.audioUrl;
      setActivePlaybackId(turn.id);
      setState("speaking");
      try {
        await attachPlaybackAnalyser(audio, audioCtxRef, analyserRef, playbackLevelRef);
        await audio.play();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Couldn't play audio");
        setState("idle");
        setActivePlaybackId(null);
      }
    },
    []
  );

  const stopPlayback = useCallback(() => {
    audioRef.current?.pause();
    setState("idle");
    setActivePlaybackId(null);
  }, []);

  const appendTurn = useCallback((turn: ConversationTurn) => {
    setTurns((prev) => [...prev, turn]);
  }, []);

  const handleAgentResult = useCallback(
    async (result: VoiceTurnResult) => {
      const { transcript } = result;
      if (transcript.user_text) {
        appendTurn({
          id: `${Date.now()}-user`,
          role: "user",
          content: transcript.user_text,
          createdAt: Date.now(),
        });
      }
      const audioUrl = turnAudioUrl(result);
      const assistantTurn: ConversationTurn = {
        id: `${Date.now()}-assistant`,
        role: "assistant",
        content: transcript.assistant_text,
        audioUrl,
        cacheHit: result.cache_hit,
        provider: result.provider,
        latencyMs: result.latency_ms,
        createdAt: Date.now(),
      };
      appendTurn(assistantTurn);

      if (autoSpeak && !muted && audioUrl) {
        await playTurn(assistantTurn);
      }
    },
    [appendTurn, autoSpeak, muted, playTurn]
  );

  const startListening = async () => {
    if (busy) return;
    try {
      setBusy(true);
      stopPlayback();
      setState("listening");
      const handle = await startRecording({
        autoStopSilenceMs: 1400,
        maxDurationMs: 25_000,
      });
      recorderRef.current = handle;
      // Wire the recorder's RMS into the waveform via ref.
      const tick = () => {
        if (!recorderRef.current) return;
        levelRef.current = recorderRef.current.getLevel();
        if (recorderRef.current.isRecording()) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't access the mic");
      setState("idle");
      setBusy(false);
    }
  };

  const finishListening = async () => {
    if (!recorderRef.current) return;
    try {
      const blob = await recorderRef.current.stop();
      recorderRef.current = null;
      if (blob.size < 1024) {
        toast("Didn't catch that — try again.", { icon: "🎙️" });
        setState("idle");
        setBusy(false);
        return;
      }
      setState("thinking");
      const result = await voiceAgentTurn({
        audio: blob,
        sector: sector.trim() || undefined,
        mode,
        voice,
        language,
        history: conversationContext,
      });
      if (!result.is_speech || !result.transcript.user_text) {
        toast("Mostly silence — try speaking a bit louder.", { icon: "🤫" });
        setState("idle");
        return;
      }
      await handleAgentResult(result);
      if (!autoSpeak || muted || !result.audio_base64) {
        setState("idle");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Voice agent failed";
      if (message.toLowerCase().includes("cancel")) {
        setState("idle");
      } else {
        toast.error(message);
        setState("idle");
      }
    } finally {
      setBusy(false);
    }
  };

  const handleOrbClick = async () => {
    if (state === "speaking") {
      stopPlayback();
      return;
    }
    if (state === "listening") {
      await finishListening();
      return;
    }
    if (state === "thinking") return;
    await startListening();
  };

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
      setState("thinking");
      const result = await voiceQuery({
        prompt: trimmed,
        sector: sector.trim() || undefined,
        mode,
        voice,
        history: conversationContext,
      });
      await handleAgentResult(result);
      if (!autoSpeak || muted || !result.audio_base64) {
        setState("idle");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Voice query failed");
      setState("idle");
    } finally {
      setBusy(false);
    }
  };

  const handleSampleVoice = async () => {
    const target = voiceOptions.find((v) => v.value === voice);
    if (!target?.sample_text) return;
    try {
      setBusy(true);
      setState("thinking");
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
      await playTurn(turn);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sample failed");
      setState("idle");
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

  const orbState: VoiceOrbState = muted ? "muted" : state;
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
                  Real-time conversational AI
                </Badge>
              </div>
              <h3 className="text-2xl font-semibold [font-family:var(--font-display)]">
                Talk to your market intelligence
              </h3>
              <p className="mt-2 max-w-xl text-sm text-slate-300">
                Ask. Listen. Repeat. Built with cached TTS, voice-activity trimming, and
                regional fallback so every conversation runs lean.
              </p>
            </div>
            <CostSavingsBadge variant="compact" />
          </div>

          <div className="grid gap-6 lg:grid-cols-[auto_1fr]">
            <div className="grid place-items-center">
              <button
                type="button"
                onClick={() => void handleOrbClick()}
                disabled={busy && state !== "listening" && state !== "speaking"}
                className="group rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
                aria-label={
                  state === "listening"
                    ? "Stop listening"
                    : state === "speaking"
                    ? "Stop speaking"
                    : "Start listening"
                }
              >
                <VoiceOrb
                  state={orbState}
                  level={state === "speaking" ? playbackLevelRef.current : levelRef.current}
                  size={260}
                  className="transition-transform group-hover:scale-[1.02] group-active:scale-[0.98]"
                />
              </button>
              <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                  {state === "idle"
                    ? "Tap orb to speak"
                    : state === "listening"
                    ? "Listening — tap to send"
                    : state === "thinking"
                    ? "Thinking…"
                    : state === "speaking"
                    ? "Speaking — tap to stop"
                    : "Muted"}
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
                    {state === "speaking" ? "Playback" : "Mic input"}
                  </span>
                </div>
                <LiveWaveform
                  active={state === "listening" || state === "speaking"}
                  getLevel={() =>
                    state === "speaking" ? playbackLevelRef.current : levelRef.current
                  }
                  height={88}
                  bars={72}
                  color={state === "speaking" ? "cyan" : "emerald"}
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
                  onClick={() => setMuted((m) => !m)}
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
                {state === "speaking" && (
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
            if (activePlaybackId === turn.id && state === "speaking") {
              stopPlayback();
            } else {
              void playTurn(turn);
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
        onPlay={() => setState("speaking")}
        onEnded={() => {
          setState("idle");
          setActivePlaybackId(null);
        }}
        onPause={() => {
          if (state === "speaking") setState("idle");
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
  levelRef: React.MutableRefObject<number>
) {
  if (!ctxRef.current) {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctxRef.current = new Ctx();
  }
  if (!analyserRef.current) {
    const analyser = ctxRef.current.createAnalyser();
    analyser.fftSize = 1024;
    analyserRef.current = analyser;
    const source = ctxRef.current.createMediaElementSource(audio);
    source.connect(analyser);
    analyser.connect(ctxRef.current.destination);
  }
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
