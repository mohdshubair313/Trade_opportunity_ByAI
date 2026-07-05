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
    <div className="space-y-6">
      {/* ── Voice Briefing Studio ── */}
      <div className="rounded-2xl border border-white/[0.06] bg-zinc-900/30 p-6">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <Badge variant="glow">
            <Mic2 className="mr-1 h-3.5 w-3.5" />
            Voice Briefing Studio
          </Badge>
          <Badge variant="outline">
            <Headphones className="mr-1 h-3.5 w-3.5" />
            Premium TTS
          </Badge>
        </div>
        <div className="grid gap-6 lg:grid-cols-[1fr_360px] xl:grid-cols-[1fr_420px]">
          {/* Script editor */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium uppercase tracking-wider text-slate-400">Briefing script</label>
              <button
                type="button"
                onClick={() => { navigator.clipboard.writeText(voiceText); toast.success("Briefing script copied"); }}
                className="inline-flex items-center gap-1 text-xs text-slate-500 transition-colors hover:text-white"
              >
                <Copy className="h-3 w-3" />
                Copy
              </button>
            </div>
            <textarea
              value={voiceText}
              onChange={(e) => { setVoiceDirty(true); setVoiceText(e.target.value); }}
              className="h-44 w-full resize-none rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm leading-relaxed text-slate-100 outline-none transition focus:border-emerald-500/60"
              placeholder="Describe the spoken briefing you want to hear..."
            />
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                <label className="mb-1 block text-[10px] uppercase tracking-widest text-slate-500">Voice</label>
                <select value={voice} onChange={(e) => setVoice(e.target.value)} className="w-full bg-transparent text-sm text-white outline-none">
                  {VOICES.map((v) => (
                    <option key={v.value} value={v.value} className="bg-zinc-950">{v.label}</option>
                  ))}
                </select>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                <label className="mb-1 block text-[10px] uppercase tracking-widest text-slate-500">Format</label>
                <select value={voiceFormat} onChange={(e) => setVoiceFormat(e.target.value as VoiceFormat)} className="w-full bg-transparent text-sm text-white outline-none">
                  <option value="mp3" className="bg-zinc-950">MP3</option>
                  <option value="pcm" className="bg-zinc-950">PCM</option>
                </select>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                <label className="mb-1 block text-[10px] uppercase tracking-widest text-slate-500">Direction</label>
                <input value={voiceInstructions} onChange={(e) => setVoiceInstructions(e.target.value)}
                  className="w-full bg-transparent text-sm text-white outline-none" placeholder="How should the voice sound?" />
              </div>
            </div>
          </div>

          {/* Playback deck */}
          <div className="flex flex-col gap-3 rounded-2xl border border-emerald-500/15 bg-gradient-to-b from-black/40 to-black/20 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-emerald-400/70">Playback deck</p>
                <p className="mt-0.5 text-sm font-semibold text-white">{selectedVoice.label} voice operator</p>
                {voiceMeta && (
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    {voiceMeta.cacheHit ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-[10px] text-emerald-200">
                        <Zap className="h-2.5 w-2.5" /> Cache hit
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2 py-0.5 text-[10px] text-cyan-100">
                        <Sparkles className="h-2.5 w-2.5" /> Fresh · {voiceMeta.latencyMs}ms
                      </span>
                    )}
                    <span className="text-[10px] text-slate-500">{voiceMeta.charCount.toLocaleString()} chars</span>
                  </div>
                )}
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-2">
                <AudioLines className="h-4 w-4 text-emerald-400" />
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/30 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[10px] text-slate-400">Stream</span>
                <span className="text-[10px] text-slate-500">{voiceBusy ? bytesLabel(voiceBytes) : audioReady ? "Ready" : "Idle"}</span>
              </div>
              <div className="flex h-16 items-end gap-[3px] rounded-lg border border-white/10 bg-black/40 px-3 py-3">
                {voiceBars.map((bar) => (
                  <span
                    key={bar}
                    className={cn(
                      "w-full rounded-full bg-gradient-to-t from-emerald-500 via-cyan-400 to-white/80",
                      (voiceBusy || isPlaying) ? "opacity-100" : "opacity-20"
                    )}
                    style={{
                      height: `${24 + ((bar * 13) % 48)}%`,
                      animationDelay: `${bar * 0.08}s`,
                    }}
                  />
                ))}
              </div>
            </div>

            <audio ref={audioRef} src={audioUrl ?? undefined} controls className="w-full h-8" />

            <div className="grid grid-cols-2 gap-2">
              <Button variant="glow" size="sm" isLoading={voiceBusy} onClick={() => void handleGenerateVoice()} className="text-xs">
                {voiceBusy ? "Generating..." : "Generate"}
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

            <Link
              href={`/voice?sector=${encodeURIComponent(sector)}`}
              className="group flex items-center justify-between rounded-xl border border-emerald-400/20 bg-emerald-400/5 px-3 py-2 text-xs text-emerald-100 transition hover:border-emerald-400/40"
            >
              <span className="flex items-center gap-1.5">
                <Sparkles className="h-3 w-3 text-emerald-300" />
                Open conversational agent
              </span>
              <ArrowRight className="h-3 w-3 transition group-hover:translate-x-0.5" />
            </Link>

            <div className="rounded-xl border border-white/10 bg-black/20 p-3">
              <p className="mb-1 text-[10px] font-medium uppercase tracking-widest text-slate-500">Suggested narration angle</p>
              <p className="text-xs leading-relaxed text-slate-400 line-clamp-2">
                {deferredVoiceText.slice(0, 240)}{deferredVoiceText.length > 240 ? "..." : ""}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Vision Lab ── */}
      <div className="rounded-2xl border border-white/[0.06] bg-zinc-900/30 p-6">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <Badge variant="info">
            <ScanSearch className="mr-1 h-3.5 w-3.5" />
            Vision Lab
          </Badge>
          <Badge variant="outline">
            <FileText className="mr-1 h-3.5 w-3.5" />
            Charts & receipts
          </Badge>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          {/* Upload area */}
          <div className="rounded-xl border border-white/10 bg-black/20 p-4">
            <input ref={uploadRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => handleFileSelection(e.target.files?.[0] ?? null)} />
            <button
              type="button"
              onClick={() => uploadRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); handleFileSelection(e.dataTransfer.files?.[0] ?? null); }}
              className="group flex w-full flex-col items-center justify-center rounded-xl border border-dashed border-white/15 bg-gradient-to-b from-white/[0.02] to-white/[0.04] px-4 py-6 text-center transition hover:border-cyan-400/40"
            >
              <div className="mb-2 rounded-xl border border-white/10 bg-white/5 p-2.5">
                <UploadCloud className="h-5 w-5 text-cyan-300" />
              </div>
              <p className="text-sm font-medium text-white">Drop an image or choose a file</p>
              <p className="mt-1 text-xs text-slate-500">Charts, screenshots, invoices, or receipts</p>
            </button>

            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                <label className="mb-1 block text-[10px] uppercase tracking-widest text-slate-500">Task</label>
                <select value={visionTask} onChange={(e) => setVisionTask(e.target.value as VisionTask)}
                  className="w-full bg-transparent text-sm text-white outline-none">
                  <option value="trade_chart" className="bg-zinc-950">Trade chart</option>
                  <option value="receipt" className="bg-zinc-950">Receipt</option>
                  <option value="generic" className="bg-zinc-950">Generic</option>
                </select>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                <label className="mb-1 block text-[10px] uppercase tracking-widest text-slate-500">Question</label>
                <input value={visionQuestion} onChange={(e) => setVisionQuestion(e.target.value)}
                  className="w-full bg-transparent text-sm text-white outline-none" placeholder="e.g. support/resistance" />
              </div>
            </div>

            <Button variant="gradient" size="sm" className="mt-3 w-full text-xs" isLoading={visionBusy}
              onClick={() => void handleAnalyzeVision()}>
              {visionBusy ? "Analyzing..." : "Run Vision Analysis"}
              <TrendingUp className="h-3 w-3 ml-1" />
            </Button>
          </div>

          {/* Preview & Results */}
          <div className="space-y-4">
            {visionPreview && (
              <div className="overflow-hidden rounded-xl border border-white/10 bg-black/30">
                <Image src={visionPreview} alt="Vision upload" width={1280} height={720} unoptimized className="h-44 w-full object-cover" />
              </div>
            )}

            {visionWarnings.length > 0 && (
              <div className="space-y-1 rounded-xl border border-amber-400/20 bg-amber-400/5 p-3">
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
                    <div key={label} className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                      <p className="text-[10px] uppercase tracking-widest text-slate-500">{label}</p>
                      <p className="mt-1 text-sm font-medium text-white truncate">{value}</p>
                    </div>
                  ))}
                </div>

                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-2">Structured output</p>
                  <div className="space-y-3 text-sm text-slate-200">
                    {"summary" in analysis && typeof analysis.summary === "string" && (
                      <div>
                        <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-0.5">Summary</p>
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
                        <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                          <p className="text-[10px] uppercase tracking-widest text-slate-500">Merchant</p>
                          <p className="text-sm text-white">{String(analysis.merchant_name ?? "-")}</p>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                          <p className="text-[10px] uppercase tracking-widest text-slate-500">Total</p>
                          <p className="text-sm text-white">{String(analysis.currency ?? "")} {String(analysis.total ?? "-")}</p>
                        </div>
                      </div>
                    )}
                    {Array.isArray(analysis.line_items) && analysis.line_items.length > 0 && (
                      <div>
                        <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">Line items</p>
                        {(analysis.line_items as Array<Record<string, unknown>>).slice(0, 5).map((item, i) => (
                          <div key={i} className="flex justify-between rounded-xl border border-white/10 bg-black/20 px-3 py-2 mb-1">
                            <span className="text-xs text-white">{String(item.name ?? `Item ${i + 1}`)}</span>
                            <span className="text-xs text-slate-400">{String(item.line_total ?? item.unit_price ?? "")}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {["support_levels", "resistance_levels", "patterns", "indicators", "key_findings"].map((key) => {
                      const val = analysis[key];
                      if (!Array.isArray(val) || val.length === 0) return null;
                      return (
                        <div key={key}>
                          <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">{key.replace(/_/g, " ")}</p>
                          <div className="flex flex-wrap gap-1">
                            {val.map((entry) => <Badge key={`${key}-${String(entry)}`} variant="outline" className="text-[10px]">{String(entry)}</Badge>)}
                          </div>
                        </div>
                      );
                    })}
                    {"raw_ocr_text" in analysis && typeof analysis.raw_ocr_text === "string" && (
                      <details className="rounded-xl border border-white/10 bg-black/20 p-3">
                        <summary className="cursor-pointer text-xs font-medium text-white">Raw OCR text</summary>
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
