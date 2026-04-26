"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AlertTriangle,
  ArrowRight,
  AudioLines,
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
import { synthesize } from "@/lib/voice-client";
import { cn } from "@/lib/utils";

type VisionTask = "trade_chart" | "receipt" | "generic";
type VoiceFormat = "mp3" | "pcm";

const VOICES = [
  { value: "nova", label: "Nova", mood: "Executive and balanced" },
  { value: "alloy", label: "Alloy", mood: "Calm analyst" },
  { value: "onyx", label: "Onyx", mood: "Deep command-room tone" },
  { value: "sage", label: "Sage", mood: "Measured and premium" },
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
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB streamed`;
  }
  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(1)} KB streamed`;
  }
  return `${bytes} B streamed`;
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
  const [voiceFormat, setVoiceFormat] = useState<VoiceFormat>("mp3");
  const [voiceInstructions, setVoiceInstructions] = useState(
    "Speak like a premium market operator delivering a boardroom voice note."
  );
  const [voiceBusy, setVoiceBusy] = useState(false);
  const [voiceBytes, setVoiceBytes] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioReady, setAudioReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [voiceMeta, setVoiceMeta] = useState<{
    cacheHit: boolean;
    provider: string | null;
    latencyMs: number;
    charCount: number;
  } | null>(null);
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
  const deferredVoiceText = useDeferredValue(voiceText);

  useEffect(() => {
    const nextScript = deriveBriefingScript(report, sector);
    if (!voiceDirty || !voiceText.trim()) {
      setVoiceText(nextScript);
      setVoiceDirty(false);
    }
  }, [report, sector, voiceDirty, voiceText]);

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
    () => VOICES.find((item) => item.value === voice) ?? VOICES[0],
    [voice]
  );

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
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
        setAudioUrl(null);
      }

      const result = await synthesize(
        {
          text: voiceText,
          voice,
          responseFormat: voiceFormat,
          instructions: voiceInstructions,
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

      window.requestAnimationFrame(() => {
        audioRef.current?.play().catch(() => {
          toast.success("Voice briefing is ready. Tap play to listen.");
        });
      });
      toast.success(
        result.cacheHit
          ? "Voice briefing served from cache — zero cost"
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
    const ext = voiceFormat === "mp3" ? "mp3" : "wav";
    a.download = `${sector.replace(/\s+/g, "_").toLowerCase()}_voice_briefing.${ext}`;
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
      // navigator.share with a File works on Chromium / Safari mobile.
      const blob = await fetch(audioUrl).then((r) => r.blob());
      const ext = voiceFormat === "mp3" ? "mp3" : "wav";
      const file = new File([blob], `${sector}_voice_briefing.${ext}`, { type: blob.type });
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

  const voiceBars = Array.from({ length: 18 }, (_, index) => index);
  const analysis = visionResult?.analysis || {};

  return (
    <section className="grid gap-6 xl:grid-cols-[1.12fr_0.88fr]">
      <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(34,197,94,0.18),transparent_30%),linear-gradient(180deg,rgba(7,10,14,0.98),rgba(8,13,18,0.95))] p-6 shadow-[0_30px_120px_rgba(0,0,0,0.28)]">
        <div className="absolute inset-0 bg-[linear-gradient(115deg,transparent,rgba(255,255,255,0.05),transparent)] opacity-40" />
        <div className="relative">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <Badge variant="glow">
                  <Mic2 className="mr-1 h-3 w-3" />
                  Voice Briefing Studio
                </Badge>
                <Badge variant="outline">
                  <Headphones className="mr-1 h-3 w-3" />
                  Premium TTS
                </Badge>
              </div>
              <h3 className="text-2xl font-semibold [font-family:var(--font-display)]">
                Boardroom-grade spoken briefings
              </h3>
              <p className="mt-2 max-w-2xl text-sm text-slate-300">
                Generate a polished audio briefing from your report, stream it from the backend,
                and keep the script editable for investor calls, exports, or internal reviews.
              </p>
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="rounded-[24px] border border-white/10 bg-black/20 p-5 backdrop-blur">
              <div className="mb-3 flex items-center justify-between">
                <label className="text-sm font-medium text-slate-200">Briefing script</label>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(voiceText);
                    toast.success("Briefing script copied");
                  }}
                  className="inline-flex items-center gap-2 text-xs text-slate-400 transition-colors hover:text-white"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Copy
                </button>
              </div>
              <textarea
                value={voiceText}
                onChange={(event) => {
                  setVoiceDirty(true);
                  setVoiceText(event.target.value);
                }}
                className="h-[236px] w-full resize-none rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-4 text-sm leading-6 text-slate-100 outline-none transition focus:border-emerald-400/60"
                placeholder="Describe the spoken briefing you want to hear..."
              />

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <span className="mb-2 block text-xs uppercase tracking-[0.18em] text-slate-400">Voice</span>
                  <select
                    value={voice}
                    onChange={(event) => setVoice(event.target.value)}
                    className="w-full bg-transparent text-sm text-white outline-none"
                  >
                    {VOICES.map((item) => (
                      <option key={item.value} value={item.value} className="bg-slate-950">
                        {item.label} • {item.mood}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <span className="mb-2 block text-xs uppercase tracking-[0.18em] text-slate-400">Format</span>
                  <select
                    value={voiceFormat}
                    onChange={(event) => setVoiceFormat(event.target.value as VoiceFormat)}
                    className="w-full bg-transparent text-sm text-white outline-none"
                  >
                    <option value="mp3" className="bg-slate-950">MP3</option>
                    <option value="pcm" className="bg-slate-950">PCM</option>
                  </select>
                </label>
              </div>

              <label className="mt-3 block rounded-2xl border border-white/10 bg-white/5 p-3">
                <span className="mb-2 block text-xs uppercase tracking-[0.18em] text-slate-400">Delivery direction</span>
                <input
                  value={voiceInstructions}
                  onChange={(event) => setVoiceInstructions(event.target.value)}
                  className="w-full bg-transparent text-sm text-white outline-none"
                  placeholder="How should the voice sound?"
                />
              </label>
            </div>

            <div className="flex flex-col gap-4 rounded-[24px] border border-emerald-400/18 bg-[linear-gradient(180deg,rgba(6,10,14,0.96),rgba(8,16,22,0.94))] p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-emerald-300/80">Playback deck</p>
                  <h4 className="mt-1 text-xl font-semibold">{selectedVoice.label} voice operator</h4>
                  {voiceMeta && (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {voiceMeta.cacheHit ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-[11px] text-emerald-200">
                          <Zap className="h-3 w-3" /> Cache hit · 0 ms
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2 py-0.5 text-[11px] text-cyan-100">
                          <Sparkles className="h-3 w-3" />
                          Fresh · {voiceMeta.provider ?? "ai"}
                          {voiceMeta.latencyMs ? ` · ${voiceMeta.latencyMs} ms` : ""}
                        </span>
                      )}
                      <span className="text-[11px] text-slate-400">
                        {voiceMeta.charCount.toLocaleString()} chars
                      </span>
                    </div>
                  )}
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/8 p-3">
                  <AudioLines className="h-5 w-5 text-emerald-300" />
                </div>
              </div>

              <div className="rounded-[24px] border border-white/10 bg-black/20 p-5">
                <div className="mb-3 flex items-center justify-between text-sm text-slate-300">
                  <span>Streaming status</span>
                  <span>{voiceBusy ? bytesLabel(voiceBytes) : audioReady ? "Ready to play" : "Idle"}</span>
                </div>
                <div className="flex h-28 items-end gap-2 rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0.06))] px-4 py-5">
                  {voiceBars.map((bar) => (
                    <span
                      key={bar}
                      className={cn(
                        "voice-meter-bar w-full rounded-full bg-gradient-to-t from-emerald-500 via-cyan-400 to-white/90",
                        (voiceBusy || isPlaying) ? "opacity-100" : "opacity-30"
                      )}
                      style={{
                        height: `${28 + ((bar * 17) % 64)}%`,
                        animationDelay: `${bar * 0.08}s`,
                      }}
                    />
                  ))}
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                  <span>{voiceBusy ? "Receiving audio chunks from the backend..." : "Your next market memo, ready on demand."}</span>
                  {audioReady && <span>{selectedVoice.mood}</span>}
                </div>
              </div>

              <audio ref={audioRef} src={audioUrl ?? undefined} controls className="w-full" />

              <div className="grid gap-3 sm:grid-cols-2">
                <Button
                  variant="glow"
                  size="lg"
                  isLoading={voiceBusy}
                  onClick={() => void handleGenerateVoice()}
                >
                  {voiceBusy ? "Generating..." : "Generate Voice Briefing"}
                  <Waves className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  disabled={!voiceBusy}
                  onClick={() => abortRef.current?.abort()}
                >
                  Stop Generation
                </Button>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDownloadAudio}
                  disabled={!audioReady}
                >
                  <Download className="h-4 w-4" />
                  Download audio
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => void handleShareAudio()}
                  disabled={!audioReady}
                >
                  <Share2 className="h-4 w-4" />
                  Share / copy link
                </Button>
              </div>

              <Link
                href={`/voice?sector=${encodeURIComponent(sector)}`}
                className="group flex items-center justify-between rounded-2xl border border-emerald-400/25 bg-emerald-400/8 px-4 py-3 text-sm text-emerald-50 transition hover:border-emerald-400/45 hover:bg-emerald-400/12"
              >
                <span className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-emerald-300" />
                  Open the conversational agent for this sector
                </span>
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
              </Link>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
                <div className="mb-2 flex items-center gap-2 text-white">
                  <Sparkles className="h-4 w-4 text-emerald-300" />
                  Suggested narration angle
                </div>
                <p className="leading-6">
                  {deferredVoiceText.slice(0, 240)}
                  {deferredVoiceText.length > 240 ? "..." : ""}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.18),transparent_28%),linear-gradient(180deg,rgba(7,10,14,0.98),rgba(8,13,18,0.96))] p-6 shadow-[0_30px_120px_rgba(0,0,0,0.24)]">
        <div className="absolute inset-0 bg-[linear-gradient(145deg,transparent,rgba(255,255,255,0.04),transparent)] opacity-30" />
        <div className="relative">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <Badge variant="info">
                  <ScanSearch className="mr-1 h-3 w-3" />
                  Vision Lab
                </Badge>
                <Badge variant="outline">
                  <FileText className="mr-1 h-3 w-3" />
                  Charts & receipts
                </Badge>
              </div>
              <h3 className="text-2xl font-semibold [font-family:var(--font-display)]">
                Multimodal verification layer
              </h3>
              <p className="mt-2 text-sm text-slate-300">
                Upload a chart, invoice, or image and turn it into structured analysis with server-side validation and clear uncertainty handling.
              </p>
            </div>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
            <input
              ref={uploadRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => handleFileSelection(event.target.files?.[0] ?? null)}
            />
            <button
              type="button"
              onClick={() => uploadRef.current?.click()}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                handleFileSelection(event.dataTransfer.files?.[0] ?? null);
              }}
              className="group flex w-full flex-col items-center justify-center rounded-[22px] border border-dashed border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0.05))] px-6 py-8 text-center transition hover:border-cyan-400/45 hover:bg-cyan-400/5"
            >
              <div className="mb-4 rounded-2xl border border-white/10 bg-white/8 p-4">
                <UploadCloud className="h-6 w-6 text-cyan-300" />
              </div>
              <p className="text-base font-medium text-white">
                Drop an image here or choose a file
              </p>
              <p className="mt-2 max-w-sm text-sm text-slate-400">
                Great for candlestick charts, annotated market screenshots, invoices, or photographed receipts.
              </p>
            </button>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <span className="mb-2 block text-xs uppercase tracking-[0.18em] text-slate-400">Task mode</span>
                <select
                  value={visionTask}
                  onChange={(event) => setVisionTask(event.target.value as VisionTask)}
                  className="w-full bg-transparent text-sm text-white outline-none"
                >
                  <option value="trade_chart" className="bg-slate-950">Trade chart</option>
                  <option value="receipt" className="bg-slate-950">Receipt / invoice</option>
                  <option value="generic" className="bg-slate-950">Generic image</option>
                </select>
              </label>
              <label className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <span className="mb-2 block text-xs uppercase tracking-[0.18em] text-slate-400">Focus question</span>
                <input
                  value={visionQuestion}
                  onChange={(event) => setVisionQuestion(event.target.value)}
                  className="w-full bg-transparent text-sm text-white outline-none"
                  placeholder="Example: highlight support and resistance"
                />
              </label>
            </div>

            <Button
              variant="gradient"
              size="lg"
              className="mt-4 w-full"
              isLoading={visionBusy}
              onClick={() => void handleAnalyzeVision()}
            >
              {visionBusy ? "Analyzing..." : "Run Vision Analysis"}
              <TrendingUp className="h-4 w-4" />
            </Button>
          </div>

          {visionPreview && (
            <div className="mt-5 overflow-hidden rounded-[24px] border border-white/10 bg-black/20">
              <Image
                src={visionPreview}
                alt="Vision upload preview"
                width={1280}
                height={720}
                unoptimized
                className="h-64 w-full object-cover"
              />
            </div>
          )}

          {visionWarnings.length > 0 && (
            <div className="mt-5 space-y-2 rounded-[24px] border border-amber-400/25 bg-amber-400/10 p-4">
              {visionWarnings.map((warning) => (
                <div key={warning} className="flex items-start gap-2 text-sm text-amber-100">
                  <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <span>{warning}</span>
                </div>
              ))}
            </div>
          )}

          {visionResult && (
            <div className="mt-5 grid gap-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Provider</p>
                  <p className="mt-2 text-base font-medium text-white">{visionResult.provider}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Model</p>
                  <p className="mt-2 text-base font-medium text-white">{visionResult.model}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Confidence</p>
                  <p className="mt-2 text-base font-medium text-white">
                    {confidenceLabel((analysis.confidence as number | undefined) ?? 0)}
                  </p>
                </div>
              </div>

              <div className="rounded-[24px] border border-white/10 bg-black/20 p-5">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Structured output</p>
                <div className="mt-4 space-y-4 text-sm text-slate-200">
                  {"summary" in analysis && typeof analysis.summary === "string" && (
                    <div>
                      <p className="mb-1 text-xs uppercase tracking-[0.18em] text-slate-400">Summary</p>
                      <p className="leading-6">{analysis.summary}</p>
                    </div>
                  )}

                  {"trend" in analysis && (
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="info">Trend: {String(analysis.trend)}</Badge>
                      {"signal" in analysis && <Badge variant="success">Signal: {String(analysis.signal)}</Badge>}
                      {"timeframe_guess" in analysis && (
                        <Badge variant="outline">Timeframe: {String(analysis.timeframe_guess)}</Badge>
                      )}
                    </div>
                  )}

                  {"merchant_name" in analysis && (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Merchant</p>
                        <p className="mt-2 text-white">{String(analysis.merchant_name ?? "Unknown")}</p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Total</p>
                        <p className="mt-2 text-white">
                          {String(analysis.currency ?? "")} {String(analysis.total ?? "N/A")}
                        </p>
                      </div>
                    </div>
                  )}

                  {Array.isArray(analysis.line_items) && analysis.line_items.length > 0 && (
                    <div>
                      <p className="mb-2 text-xs uppercase tracking-[0.18em] text-slate-400">Line items</p>
                      <div className="space-y-2">
                        {(analysis.line_items as Array<Record<string, unknown>>).slice(0, 5).map((item, index) => (
                          <div key={`${String(item.name ?? "item")}-${index}`} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                            <div className="flex items-center justify-between gap-3">
                              <span className="font-medium text-white">{String(item.name ?? `Item ${index + 1}`)}</span>
                              <span className="text-xs text-slate-400">{String(item.line_total ?? item.unit_price ?? "")}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {["support_levels", "resistance_levels", "patterns", "indicators", "key_findings"].map((key) => {
                    const value = analysis[key];
                    if (!Array.isArray(value) || value.length === 0) return null;
                    return (
                      <div key={key}>
                        <p className="mb-2 text-xs uppercase tracking-[0.18em] text-slate-400">
                          {key.replace(/_/g, " ")}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {value.map((entry) => (
                            <Badge key={`${key}-${String(entry)}`} variant="outline">
                              {String(entry)}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    );
                  })}

                  {"raw_ocr_text" in analysis && typeof analysis.raw_ocr_text === "string" && (
                    <details className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <summary className="cursor-pointer text-sm font-medium text-white">Raw OCR text</summary>
                      <pre className="mt-3 whitespace-pre-wrap text-xs text-slate-300">
                        {analysis.raw_ocr_text}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
