"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AlertTriangle,
  ArrowRight,
  AudioLines,
  Bot,
  Check,
  Copy,
  Download,
  FileText,
  Headphones,
  Mic2,
  ScanSearch,
  Share2,
  Sparkles,
  TrendingUp,
  UploadCloud,
  Waves,
  Zap,
} from "lucide-react";
import toast from "react-hot-toast";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  analyzeVisionImage,
  VisionAnalysisResponse,
} from "@/lib/api";
import { synthesize, voiceQuery, listVoices, VoiceOption, VOICE_PROVIDER_MAP } from "@/lib/voice-client";
import { cn } from "@/lib/utils";

type VisionTask = "trade_chart" | "receipt" | "generic";

const DEFAULT_VOICES: VoiceOption[] = [
  { value: "thalia", label: "Thalia", mood: "Warm, clear Indian English", sample_text: "Namaste. Nifty opened flat today.", accent: "indian-english", locale: "en-IN", provider: "deepgram" },
  { value: "zeus", label: "Zeus", mood: "Deep command-room tone", sample_text: "Risk first, conviction second.", accent: "indian-english", locale: "en-IN", provider: "deepgram" },
  { value: "nova", label: "Nova", mood: "Executive and balanced", sample_text: "Good morning. Markets opened steady.", accent: "neutral", locale: "en-IN", provider: "openai" },
  { value: "alloy", label: "Alloy", mood: "Calm analyst", sample_text: "On a relative-strength basis...", accent: "neutral", locale: "en-US", provider: "openai" },
  { value: "onyx", label: "Onyx", mood: "Deep command-room tone", sample_text: "Risk first, conviction second.", accent: "deep", locale: "en-US", provider: "openai" },
  { value: "kore", label: "Kore (Gemini)", mood: "Calm and measured", sample_text: "Let me check sector data.", accent: "neutral", locale: "en-IN", provider: "gemini" },
];

function deriveBriefingScript(report: string, sector: string): string {
  const cleaned = report
    .split("\n")
    .map((line) => line.replace(/^#+\s*/, "").trim())
    .filter((line) => line && !line.startsWith("---") && !line.startsWith("*Report generated"));

  const summary = cleaned.slice(0, 7).join(" ").replace(/\s+/g, " ").trim();
  const fallback = `Brief me on the ${sector} sector, the current market setup, biggest opportunities, material risks, and the best next actions.`;
  if (!summary) return fallback;

  return [
    `You are the voice briefing layer for TradeInsight AI.`,
    `Deliver a crisp spoken market briefing on the ${sector} sector.`,
    `Use a premium operator tone, around sixty to ninety seconds, and end with the single most important next move.`,
    summary,
  ].join(" ");
}

function bytesLabel(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${bytes} B`;
}

function confidenceLabel(value: unknown): string {
  const num = typeof value === "number" ? value : Number(value ?? 0);
  if (!Number.isFinite(num)) return "0%";
  return `${Math.round(num * 100)}%`;
}

function normaliseWarnings(analysis: Record<string, unknown>, fallbackWarnings: string[]) {
  const warnings = Array.isArray(analysis.warnings)
    ? analysis.warnings.filter((item): item is string => typeof item === "string")
    : [];
  const invalidReasons = Array.isArray(analysis.invalid_reasons)
    ? analysis.invalid_reasons.filter((item): item is string => typeof item === "string")
    : [];
  return [...warnings, ...invalidReasons, ...fallbackWarnings];
}

export function AIOperatorStudio({
  sector,
  report,
}: {
  sector: string;
  report: string;
}) {
  const [voiceText, setVoiceText] = useState("");
  const [voiceDirty, setVoiceDirty] = useState(false);
  const [voice, setVoice] = useState("nova");
  const [voiceInstructions, setVoiceInstructions] = useState(
    "Speak like a premium market operator delivering a boardroom voice note."
  );
  const [voiceBusy, setVoiceBusy] = useState(false);
  const [voiceBytes, setVoiceBytes] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioReady, setAudioReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [agentResponse, setAgentResponse] = useState<string | null>(null);
  const [voiceMeta, setVoiceMeta] = useState<{
    cacheHit: boolean;
    provider: string | null;
    latencyMs: number;
    charCount: number;
  } | null>(null);
  const [voiceCatalog, setVoiceCatalog] = useState<VoiceOption[]>(DEFAULT_VOICES);
  const [visionTask, setVisionTask] = useState<VisionTask>("trade_chart");
  const [visionQuestion, setVisionQuestion] = useState("");
  const [visionFile, setVisionFile] = useState<File | null>(null);
  const [visionPreview, setVisionPreview] = useState<string | null>(null);
  const [visionBusy, setVisionBusy] = useState(false);
  const [visionResult, setVisionResult] = useState<VisionAnalysisResponse | null>(null);
  const [visionWarnings, setVisionWarnings] = useState<string[]>([]);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const uploadRef = useRef<HTMLInputElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let cancelled = false;
    listVoices()
      .then((res) => {
        if (!cancelled && res?.length > 0) {
          setVoiceCatalog(res);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    // Only auto-generate the script if the user hasn't modified it yet
    if (!voiceDirty) {
      const nextScript = deriveBriefingScript(report, sector);
      setVoiceText(nextScript);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [report, sector]);

  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      if (visionPreview) URL.revokeObjectURL(visionPreview);
      abortRef.current?.abort();
    };
  }, [audioUrl, visionPreview]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => setIsPlaying(false);
    const onLoaded = () => setAudioReady(true);

    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("loadedmetadata", onLoaded);

    return () => {
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("loadedmetadata", onLoaded);
    };
  }, []);

  const selectedVoice = useMemo(
    () => voiceCatalog.find((item) => item.value === voice) ?? voiceCatalog[0],
    [voice, voiceCatalog]
  );

  /**
   * Voice generation: If the user has modified the script (custom prompt),
   * route through the voice agent which processes the prompt with LLM context
   * and then synthesizes speech. Otherwise, use direct TTS for the auto-generated
   * report summary.
   */
  const handleGenerateVoice = async () => {
    if (!voiceText.trim()) {
      toast.error("Add some text for the briefing first.");
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      setVoiceBusy(true);
      setVoiceBytes(0);
      setAudioReady(false);
      setVoiceMeta(null);
      setAgentResponse(null);
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
        setAudioUrl(null);
      }

      const preferredProvider = selectedVoice?.provider || VOICE_PROVIDER_MAP[voice];

      if (voiceDirty) {
        // User wrote a custom prompt → route through voice agent for AI processing
        const promptWithStyle = voiceInstructions.trim() 
          ? `${voiceText}\n\n[STYLE DIRECTION: ${voiceInstructions}]` 
          : voiceText;
          
        const result = await voiceQuery(
          {
            prompt: promptWithStyle,
            sector,
            mode: "briefing",
            voice,
            responseFormat: "mp3",
            preferredProvider,
          },
          controller.signal
        );

        // Agent returns assistant text + audio as base64
        const assistantText = result.transcript?.assistant_text || "";
        setAgentResponse(assistantText);

        if (result.audio_base64 && result.audio_format) {
          // Decode base64 audio
          const binary = atob(result.audio_base64);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
          const blob = new Blob([bytes.buffer], { type: result.audio_format });
          const url = URL.createObjectURL(blob);
          setAudioUrl(url);
          setAudioReady(true);
          setVoiceBytes(bytes.length);
          setVoiceMeta({
            cacheHit: result.cache_hit,
            provider: result.provider,
            latencyMs: result.latency_ms,
            charCount: assistantText.length,
          });
        }
      } else {
        // Auto-generated script → direct TTS synthesis (cheaper, no LLM call)
        const result = await synthesize(
          {
            text: voiceText,
            voice,
            responseFormat: "mp3",
            instructions: voiceInstructions,
            preferredProvider,
          },
          {
            signal: controller.signal,
            onChunk: (received) => setVoiceBytes(received),
          }
        );

        setAudioUrl(result.audioUrl);
        setAudioReady(true);
        setVoiceMeta({
          cacheHit: result.cacheHit,
          provider: result.provider,
          latencyMs: result.latencyMs,
          charCount: result.charCount,
        });
      }

      window.requestAnimationFrame(() => {
        audioRef.current?.play().catch(() => {
          toast.success("Voice briefing is ready. Tap play to listen.");
        });
      });
      toast.success(
        voiceMeta?.cacheHit
          ? "Voice briefing served from cache — zero cost"
          : voiceDirty
            ? "Agent briefing generated"
            : "Voice briefing generated"
      );
    } catch (error) {
      if ((error as Error).name === "AbortError") {
        toast("Voice generation stopped.", { icon: "⏹️" });
      } else {
        toast.error(error instanceof Error ? error.message : "Unable to generate voice briefing");
      }
    } finally {
      setVoiceBusy(false);
      abortRef.current = null;
    }
  };

  const handleDownloadAudio = () => {
    if (!audioUrl) {
      toast("Generate a briefing first.", { icon: "🎧" });
      return;
    }
    const a = document.createElement("a");
    a.href = audioUrl;
    a.download = `${sector.replace(/\s+/g, "_").toLowerCase()}_voice_briefing.mp3`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handleShareAudio = async () => {
    if (!audioUrl) {
      toast("Generate a briefing first.", { icon: "🎧" });
      return;
    }
    try {
      const blob = await fetch(audioUrl).then((r) => r.blob());
      const file = new File([blob], `${sector}_voice_briefing.mp3`, { type: blob.type });
      const navAny = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
      if (navAny.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `${sector} voice briefing` });
        return;
      }
      await navigator.clipboard.writeText(audioUrl);
      toast.success("Audio link copied to clipboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't share");
    }
  };

  const handleAnalyzeVision = async () => {
    if (!visionFile) {
      toast.error("Upload an image first.");
      return;
    }

    try {
      setVisionBusy(true);
      const result = await analyzeVisionImage(visionFile, visionTask, visionQuestion);
      setVisionResult(result);
      setVisionWarnings(normaliseWarnings(result.analysis, result.warnings || []));
      toast.success("Vision analysis completed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Vision analysis failed");
    } finally {
      setVisionBusy(false);
    }
  };

  const handleFileSelection = (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file.");
      return;
    }
    if (visionPreview) {
      URL.revokeObjectURL(visionPreview);
    }
    const preview = URL.createObjectURL(file);
    setVisionFile(file);
    setVisionPreview(preview);
    setVisionResult(null);
    setVisionWarnings([]);
  };

  const voiceBars = Array.from({ length: 24 }, (_, index) => index);
  const analysis = visionResult?.analysis || {};
  const isActive = voiceBusy || isPlaying;

  return (
    <div className="space-y-8">
      {/* ── Voice Briefing Studio ── */}
      <div className="rounded-2xl border border-emerald-500/10 bg-gradient-to-b from-zinc-900/50 to-zinc-950/30 p-6 relative overflow-hidden">
        {/* Subtle background mesh */}
        <div className="pointer-events-none absolute inset-0 opacity-30" style={{ background: "radial-gradient(ellipse at 20% 30%, rgba(34,197,94,0.05), transparent 60%), radial-gradient(ellipse at 80% 70%, rgba(6,182,212,0.04), transparent 60%)" }} />

        <div className="flex flex-wrap items-center gap-2 mb-5 relative z-10">
          <Badge variant="glow">
            <Mic2 className="mr-1.5 h-3.5 w-3.5" />
            Voice Briefing Studio
          </Badge>
          <Badge variant="outline">
            <Headphones className="mr-1.5 h-3.5 w-3.5" />
            Premium TTS
          </Badge>
          {voiceDirty && (
            <Badge variant="info">
              <Bot className="mr-1 h-3 w-3" />
              Agent Mode
            </Badge>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_380px] xl:grid-cols-[1fr_440px] relative z-10">
          {/* Script editor */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">
                {voiceDirty ? "Agent Prompt" : "Briefing Script"}
              </label>
              <button
                type="button"
                onClick={() => { navigator.clipboard.writeText(voiceText); toast.success("Copied to clipboard"); }}
                className="inline-flex items-center gap-1.5 text-[11px] text-slate-500 transition-colors hover:text-white rounded-lg px-2 py-1 hover:bg-white/5"
              >
                <Copy className="h-3 w-3" />
                Copy
              </button>
            </div>
            <textarea
              value={voiceText}
              onChange={(e) => { setVoiceDirty(true); setVoiceText(e.target.value); }}
              className="h-48 w-full resize-none rounded-xl border border-white/10 bg-black/50 px-4 py-3.5 text-sm leading-relaxed text-slate-100 outline-none transition-all duration-300 focus:border-emerald-500/50 focus:shadow-[0_0_20px_rgba(34,197,94,0.08)] placeholder:text-slate-600"
              placeholder="Write a custom prompt for the AI agent, or use the auto-generated briefing script..."
            />

            {voiceDirty && (
              <div className="rounded-lg border border-emerald-500/15 bg-emerald-500/5 px-3 py-2 text-[11px] text-emerald-300/80 flex items-start gap-2">
                <Bot className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                <span>Agent mode: Your prompt will be processed by the AI agent with sector context. The agent will generate a contextual response and voice it.</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              {/* Voice selector — card picker */}
              <div className="col-span-2">
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-semibold">Select Voice & Accent</label>
                  <span className="text-[10px] text-emerald-400/70 font-mono">{voiceCatalog.length} options available</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {voiceCatalog.map((v) => {
                    const providerTag = (v.provider || "openai").toUpperCase();
                    const isDeepgram = v.provider === "deepgram";
                    const isGemini = v.provider === "gemini";
                    return (
                      <button
                        key={v.value}
                        type="button"
                        onClick={() => setVoice(v.value)}
                        className={cn(
                          "rounded-xl border px-3 py-2.5 text-left transition-all duration-200 relative group overflow-hidden",
                          voice === v.value
                            ? "border-emerald-500/50 bg-emerald-500/10 shadow-[0_0_16px_rgba(34,197,94,0.15)]"
                            : "border-white/8 bg-black/30 hover:border-white/15 hover:bg-white/[0.04]"
                        )}
                        title={v.sample_text || v.mood}
                      >
                        <div className="flex items-center justify-between gap-1.5 mb-1">
                          <span className={cn("text-xs font-bold truncate", voice === v.value ? "text-emerald-300" : "text-white")}>
                            {v.label}
                          </span>
                          <span className={cn(
                            "text-[9px] px-1.5 py-0.2 rounded font-mono font-medium tracking-wider uppercase flex-shrink-0",
                            isDeepgram ? "bg-amber-500/15 text-amber-300 border border-amber-500/30" :
                            isGemini ? "bg-blue-500/15 text-blue-300 border border-blue-500/30" :
                            "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                          )}>
                            {providerTag}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 line-clamp-1">{v.mood}</p>
                        {v.accent && (
                          <p className="text-[9px] text-slate-500 mt-0.5 capitalize">{v.accent.replace("-", " ")}</p>
                        )}
                        {voice === v.value && (
                          <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Voice style direction */}
              <div className="col-span-2 rounded-xl border border-white/8 bg-black/30 px-3 py-2.5">
                <label className="mb-1.5 block text-[10px] uppercase tracking-[0.2em] text-slate-500 font-semibold">Voice Style Direction</label>
                <input
                  value={voiceInstructions}
                  onChange={(e) => setVoiceInstructions(e.target.value)}
                  className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-600"
                  placeholder="How should the voice sound? e.g. confident, measured..."
                />
              </div>
            </div>
          </div>

          {/* Playback deck */}
          <div className="flex flex-col gap-3 rounded-2xl border border-emerald-500/15 bg-gradient-to-b from-black/60 to-black/30 p-5 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[0.25em] text-emerald-400/60 font-bold">Playback Deck</p>
                <p className="mt-0.5 text-sm font-bold text-white">{selectedVoice.label} <span className="text-emerald-400/60 font-normal">voice operator</span></p>
                {voiceMeta && (
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    {voiceMeta.cacheHit ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-[10px] text-emerald-200 font-medium">
                        <Zap className="h-2.5 w-2.5" /> Cache hit
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2 py-0.5 text-[10px] text-cyan-100 font-medium">
                        <Sparkles className="h-2.5 w-2.5" /> {voiceMeta.latencyMs}ms
                      </span>
                    )}
                    <span className="text-[10px] text-slate-500 font-mono">{voiceMeta.charCount.toLocaleString()} chars</span>
                  </div>
                )}
              </div>
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-2.5">
                <AudioLines className={cn("h-4.5 w-4.5 text-emerald-400", isActive && "animate-pulse")} />
              </div>
            </div>

            {/* Equalizer visualiser */}
            <div className="rounded-xl border border-white/8 bg-black/50 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[10px] text-slate-500 font-medium">Stream</span>
                <span className="text-[10px] text-slate-500 font-mono">
                  {voiceBusy ? bytesLabel(voiceBytes) : audioReady ? "Ready" : "Idle"}
                </span>
              </div>
              <div className="flex h-16 items-end gap-[2px] rounded-xl border border-white/6 bg-black/60 px-3 py-3">
                {voiceBars.map((bar) => (
                  <span
                    key={bar}
                    className={cn(
                      "w-full rounded-full bg-gradient-to-t from-emerald-500 via-cyan-400 to-white/80",
                      isActive ? "voice-bar-active" : "voice-bar-idle"
                    )}
                    style={{
                      height: isActive ? undefined : "15%",
                      animationDelay: isActive ? `${bar * 0.06}s` : undefined,
                    }}
                  />
                ))}
              </div>
            </div>

            <audio ref={audioRef} src={audioUrl ?? undefined} controls className="w-full h-9" />

            <div className="grid grid-cols-2 gap-2">
              <Button variant="glow" size="sm" isLoading={voiceBusy} onClick={() => void handleGenerateVoice()} className="text-xs font-bold">
                {voiceBusy ? "Generating..." : voiceDirty ? "Run Agent" : "Generate"}
                <Waves className="h-3 w-3 ml-1" />
              </Button>
              <Button variant="outline" size="sm" disabled={!voiceBusy} onClick={() => abortRef.current?.abort()} className="text-xs">
                Stop
              </Button>
            </div>

            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={handleDownloadAudio} disabled={!audioReady} className="text-xs flex-1">
                <Download className="h-3 w-3 mr-1" /> Download
              </Button>
              <Button variant="ghost" size="sm" onClick={() => void handleShareAudio()} disabled={!audioReady} className="text-xs flex-1">
                <Share2 className="h-3 w-3 mr-1" /> Share
              </Button>
            </div>

            {/* Agent response panel */}
            {agentResponse && (
              <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/[0.03] p-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <Bot className="h-3 w-3 text-emerald-400" />
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400/70">Agent Response</p>
                </div>
                <p className="text-xs leading-relaxed text-slate-300 line-clamp-6">
                  {agentResponse}
                </p>
              </div>
            )}

            <Link
              href={`/voice?sector=${encodeURIComponent(sector)}`}
              className="group flex items-center justify-between rounded-xl border border-emerald-400/15 bg-emerald-400/5 px-3 py-2.5 text-xs text-emerald-200 transition-all hover:border-emerald-400/30 hover:bg-emerald-400/8"
            >
              <span className="flex items-center gap-1.5">
                <Sparkles className="h-3 w-3 text-emerald-300" />
                Open conversational agent
              </span>
              <ArrowRight className="h-3 w-3 transition group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* ── Vision Lab ── */}
      <div className="rounded-2xl border border-cyan-500/10 bg-gradient-to-b from-zinc-900/50 to-zinc-950/30 p-6 relative overflow-hidden">
        {/* Subtle background mesh */}
        <div className="pointer-events-none absolute inset-0 opacity-30" style={{ background: "radial-gradient(ellipse at 80% 20%, rgba(6,182,212,0.05), transparent 60%), radial-gradient(ellipse at 20% 80%, rgba(139,92,246,0.03), transparent 60%)" }} />

        <div className="flex flex-wrap items-center gap-2 mb-5 relative z-10">
          <Badge variant="info">
            <ScanSearch className="mr-1.5 h-3.5 w-3.5" />
            Vision Lab
          </Badge>
          <Badge variant="outline">
            <FileText className="mr-1.5 h-3.5 w-3.5" />
            Charts & receipts
          </Badge>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_1fr] relative z-10">
          {/* Upload area */}
          <div className="rounded-xl border border-white/8 bg-black/30 p-4">
            <input ref={uploadRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => handleFileSelection(e.target.files?.[0] ?? null)} />
            <button
              type="button"
              onClick={() => uploadRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); handleFileSelection(e.dataTransfer.files?.[0] ?? null); }}
              className="group flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-white/10 bg-gradient-to-b from-white/[0.02] to-white/[0.01] px-4 py-8 text-center transition-all duration-300 hover:border-cyan-400/40 hover:bg-cyan-400/[0.02] hover:shadow-[0_0_30px_rgba(6,182,212,0.06)]"
            >
              <div className="mb-3 rounded-xl border border-white/10 bg-white/5 p-3 group-hover:border-cyan-400/20 group-hover:bg-cyan-400/5 transition-colors">
                <UploadCloud className="h-6 w-6 text-cyan-300" />
              </div>
              <p className="text-sm font-semibold text-white">Drop an image or choose a file</p>
              <p className="mt-1.5 text-xs text-slate-500">Charts, screenshots, invoices, or receipts</p>
            </button>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-white/8 bg-black/30 px-3 py-2.5">
                <label className="mb-1.5 block text-[10px] uppercase tracking-[0.2em] text-slate-500 font-semibold">Task</label>
                <select value={visionTask} onChange={(e) => setVisionTask(e.target.value as VisionTask)}
                  className="w-full bg-transparent text-sm text-white outline-none">
                  <option value="trade_chart" className="bg-zinc-950">Trade chart</option>
                  <option value="receipt" className="bg-zinc-950">Receipt</option>
                  <option value="generic" className="bg-zinc-950">Generic</option>
                </select>
              </div>
              <div className="rounded-xl border border-white/8 bg-black/30 px-3 py-2.5">
                <label className="mb-1.5 block text-[10px] uppercase tracking-[0.2em] text-slate-500 font-semibold">Question</label>
                <input value={visionQuestion} onChange={(e) => setVisionQuestion(e.target.value)}
                  className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-600" placeholder="e.g. support/resistance" />
              </div>
            </div>

            <Button variant="gradient" size="sm" className="mt-4 w-full text-xs font-bold" isLoading={visionBusy}
              onClick={() => void handleAnalyzeVision()}>
              {visionBusy ? "Analyzing..." : "Run Vision Analysis"}
              <TrendingUp className="h-3 w-3 ml-1" />
            </Button>
          </div>

          {/* Preview & Results */}
          <div className="space-y-4">
            {visionPreview && (
              <div className="overflow-hidden rounded-xl border border-white/8 bg-black/40 group/preview">
                <Image src={visionPreview} alt="Vision upload" width={1280} height={720} unoptimized className="h-48 w-full object-cover transition-transform duration-500 group-hover/preview:scale-[1.02]" />
              </div>
            )}

            {visionWarnings.length > 0 && (
              <div className="space-y-1.5 rounded-xl border border-amber-400/20 bg-amber-400/5 p-3">
                {visionWarnings.map((w) => (
                  <div key={w} className="flex items-start gap-2 text-xs text-amber-200">
                    <AlertTriangle className="mt-0.5 h-3 w-3 flex-shrink-0" />
                    <span>{w}</span>
                  </div>
                ))}
              </div>
            )}

            {visionResult && (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  {[["Provider", visionResult.provider], ["Model", visionResult.model], ["Confidence", confidenceLabel((analysis.confidence as number | undefined) ?? 0)]].map(([label, value]) => (
                    <div key={label} className="rounded-xl border border-white/8 bg-black/30 px-3 py-2.5">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-semibold">{label}</p>
                      <p className="mt-1 text-sm font-bold text-white truncate">{value}</p>
                    </div>
                  ))}
                </div>

                <div className="rounded-xl border border-white/8 bg-black/30 p-4">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-semibold mb-3">Structured output</p>
                  <div className="space-y-3 text-sm text-slate-200">
                    {"summary" in analysis && typeof analysis.summary === "string" && (
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-0.5">Summary</p>
                        <p className="text-xs leading-relaxed">{analysis.summary}</p>
                      </div>
                    )}
                    {"trend" in analysis && (
                      <div className="flex flex-wrap gap-1.5">
                        <Badge variant="info">Trend: {String(analysis.trend)}</Badge>
                        {"signal" in analysis && <Badge variant="success">Signal: {String(analysis.signal)}</Badge>}
                      </div>
                    )}
                    {"merchant_name" in analysis && (
                      <div className="grid grid-cols-2 gap-2">
                        <div className="rounded-xl border border-white/8 bg-black/30 px-3 py-2.5">
                          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Merchant</p>
                          <p className="text-sm text-white font-medium">{String(analysis.merchant_name ?? "-")}</p>
                        </div>
                        <div className="rounded-xl border border-white/8 bg-black/30 px-3 py-2.5">
                          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Total</p>
                          <p className="text-sm text-white font-medium">{String(analysis.currency ?? "")} {String(analysis.total ?? "-")}</p>
                        </div>
                      </div>
                    )}
                    {Array.isArray(analysis.line_items) && analysis.line_items.length > 0 && (
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-1.5">Line items</p>
                        {(analysis.line_items as Array<Record<string, unknown>>).slice(0, 5).map((item, i) => (
                          <div key={i} className="flex justify-between rounded-xl border border-white/8 bg-black/30 px-3 py-2 mb-1">
                            <span className="text-xs text-white font-medium">{String(item.name ?? `Item ${i + 1}`)}</span>
                            <span className="text-xs text-slate-400 font-mono">{String(item.line_total ?? item.unit_price ?? "")}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {["support_levels", "resistance_levels", "patterns", "indicators", "key_findings"].map((key) => {
                      const val = analysis[key];
                      if (!Array.isArray(val) || val.length === 0) return null;
                      return (
                        <div key={key}>
                          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-1.5">{key.replace(/_/g, " ")}</p>
                          <div className="flex flex-wrap gap-1">
                            {val.map((entry) => <Badge key={`${key}-${String(entry)}`} variant="outline" className="text-[10px]">{String(entry)}</Badge>)}
                          </div>
                        </div>
                      );
                    })}
                    {"raw_ocr_text" in analysis && typeof analysis.raw_ocr_text === "string" && (
                      <details className="rounded-xl border border-white/8 bg-black/30 p-3">
                        <summary className="cursor-pointer text-xs font-semibold text-white">Raw OCR text</summary>
                        <pre className="mt-2 whitespace-pre-wrap text-xs text-slate-400">{analysis.raw_ocr_text}</pre>
                      </details>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
