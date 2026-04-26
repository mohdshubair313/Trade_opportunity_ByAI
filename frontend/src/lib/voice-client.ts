/**
 * Voice Agent client — browser-side counterpart to app/voice_agent.py.
 *
 * Three concerns live here so the React components stay focused on UI:
 *
 * 1. Microphone capture → WAV. The browser hands you `audio/webm;codecs=opus`
 *    by default, which the backend can't decode without ffmpeg. We decode
 *    the recording with the Web Audio API and re-encode to 16-bit PCM WAV
 *    in-process. That's the format the server-side VAD expects.
 *
 * 2. Live waveform analysis. Components subscribe to a polling-friendly
 *    `getLevel()` so the UI orb can pulse with the user's voice without
 *    needing to plumb AnalyserNode references through React.
 *
 * 3. API helpers (`voiceQuery`, `voiceAgentTurn`, `synthesize`,
 *    `transcribe`, `getCacheStats`, `listVoices`). Centralised so error
 *    handling and auth are consistent.
 */
import { API_BASE_URL, getAccessToken } from "@/lib/api";

export type VoiceMode = "briefing" | "qa" | "open";
export type VoiceFormat = "mp3" | "pcm";

export interface VoiceTranscript {
  user_text: string | null;
  assistant_text: string;
  sector: string | null;
  mode: string;
}

export interface VoiceTurnResult {
  transcript: VoiceTranscript;
  audio_base64: string | null;
  audio_format: string | null;
  cache_hit: boolean;
  latency_ms: number;
  synth_latency_ms?: number;
  provider: string | null;
  model: string | null;
  is_speech?: boolean;
  vad_debug?: Record<string, unknown>;
  llm_debug?: Record<string, unknown>;
}

export interface VoiceCacheStats {
  enabled: boolean;
  entries: number;
  hits: number;
  misses: number;
  hit_ratio: number;
  bytes_saved: number;
  chars_saved: number;
  estimated_inr_saved: number;
  last_provider: string | null;
  arbitrage_enabled: boolean;
  provider_health: Record<
    string,
    { name: string; success: number; failures: number; avg_latency_ms: number; healthy: boolean }
  >;
}

export interface VoiceOption {
  value: string;
  label: string;
  mood: string;
  sample_text: string;
  accent?: string;
  locale?: string;
}

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------

function authHeaders(): Record<string, string> {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function listVoices(): Promise<VoiceOption[]> {
  const res = await fetch(`${API_BASE_URL}/api/v1/voice/voices`, {
    headers: { ...authHeaders() },
  });
  if (!res.ok) throw new Error(`Voices fetch failed: ${res.status}`);
  return res.json();
}

export async function getCacheStats(): Promise<VoiceCacheStats> {
  const res = await fetch(`${API_BASE_URL}/api/v1/voice/cache/stats`, {
    headers: { ...authHeaders() },
  });
  if (!res.ok) throw new Error(`Cache stats failed: ${res.status}`);
  return res.json();
}

export interface SynthesizeRequest {
  text: string;
  voice?: string;
  speed?: number;
  responseFormat?: VoiceFormat;
  instructions?: string;
}

export interface SynthesizeResult {
  audioBlob: Blob;
  audioUrl: string;
  cacheHit: boolean;
  provider: string | null;
  model: string | null;
  latencyMs: number;
  charCount: number;
}

export async function synthesize(
  request: SynthesizeRequest,
  options: { signal?: AbortSignal; onChunk?: (received: number) => void } = {}
): Promise<SynthesizeResult> {
  const response = await fetch(`${API_BASE_URL}/api/v1/ai/tts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify({
      text: request.text,
      voice: request.voice,
      speed: request.speed,
      response_format: request.responseFormat ?? "mp3",
      instructions: request.instructions,
    }),
    signal: options.signal,
  });
  if (!response.ok || !response.body) {
    const detail = await response.text().catch(() => "");
    throw new Error(detail || `TTS failed: ${response.status}`);
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    if (!value) continue;
    chunks.push(value);
    received += value.byteLength;
    options.onChunk?.(received);
  }

  const mimeType = response.headers.get("Content-Type") || "audio/mpeg";
  const blobParts = chunks.map(
    (chunk) =>
      chunk.buffer.slice(
        chunk.byteOffset,
        chunk.byteOffset + chunk.byteLength
      ) as ArrayBuffer
  );
  const audioBlob = new Blob(blobParts, { type: mimeType });
  return {
    audioBlob,
    audioUrl: URL.createObjectURL(audioBlob),
    cacheHit: response.headers.get("X-Cache-Hit") === "1",
    provider: response.headers.get("X-AI-Provider"),
    model: response.headers.get("X-AI-Model"),
    latencyMs: Number(response.headers.get("X-Latency-Ms") || 0),
    charCount: Number(response.headers.get("X-Char-Count") || request.text.length),
  };
}

export interface VoiceQueryRequest {
  prompt: string;
  sector?: string;
  mode?: VoiceMode;
  voice?: string;
  responseFormat?: VoiceFormat;
  speed?: number;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
}

export async function voiceQuery(
  request: VoiceQueryRequest,
  signal?: AbortSignal
): Promise<VoiceTurnResult> {
  const res = await fetch(`${API_BASE_URL}/api/v1/voice/query`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify({
      prompt: request.prompt,
      sector: request.sector,
      mode: request.mode ?? "qa",
      voice: request.voice,
      response_format: request.responseFormat ?? "mp3",
      speed: request.speed,
      history: request.history,
    }),
    signal,
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(detail || `Voice query failed: ${res.status}`);
  }
  return res.json();
}

export interface VoiceAgentTurnRequest {
  audio: Blob;
  sector?: string;
  mode?: VoiceMode;
  voice?: string;
  responseFormat?: VoiceFormat;
  speed?: number;
  language?: string;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
}

export async function voiceAgentTurn(
  request: VoiceAgentTurnRequest,
  signal?: AbortSignal
): Promise<VoiceTurnResult> {
  const form = new FormData();
  // Always upload as audio/wav — the WAV encoder below produces this. The
  // server-side VAD only knows how to decode WAV without ffmpeg.
  const wavFile = new File([request.audio], "input.wav", { type: "audio/wav" });
  form.append("audio", wavFile);
  if (request.sector) form.append("sector", request.sector);
  form.append("mode", request.mode ?? "qa");
  if (request.voice) form.append("voice", request.voice);
  form.append("response_format", request.responseFormat ?? "mp3");
  if (request.speed !== undefined) form.append("speed", String(request.speed));
  if (request.language) form.append("language", request.language);
  if (request.history && request.history.length > 0) {
    form.append("history_json", JSON.stringify(request.history));
  }

  const res = await fetch(`${API_BASE_URL}/api/v1/voice/agent`, {
    method: "POST",
    headers: { ...authHeaders() },
    body: form,
    signal,
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(detail || `Voice agent failed: ${res.status}`);
  }
  return res.json();
}

export function turnAudioUrl(turn: VoiceTurnResult): string | null {
  if (!turn.audio_base64 || !turn.audio_format) return null;
  const binary = atob(turn.audio_base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  const blob = new Blob([bytes.buffer], { type: turn.audio_format });
  return URL.createObjectURL(blob);
}

// ---------------------------------------------------------------------------
// Microphone recorder with WAV encoding + level metering
// ---------------------------------------------------------------------------

export interface RecorderOptions {
  sampleRate?: number;
  silenceThreshold?: number;
  maxDurationMs?: number;
  /** When the recorder detects this many ms of trailing silence it auto-stops. */
  autoStopSilenceMs?: number;
}

export interface RecorderHandle {
  stop: () => Promise<Blob>;
  cancel: () => void;
  /** 0..1 RMS level updated continuously while recording. */
  getLevel: () => number;
  /** Returns true if the recorder has detected ongoing silence. */
  isSilent: () => boolean;
  isRecording: () => boolean;
}

/**
 * Capture mic audio and encode the result as 16-bit PCM WAV.
 *
 * The backend VAD is optimistic but it can't recover an empty recording. We
 * monitor RMS in-browser too — the UI uses `getLevel()` to drive the orb
 * animation and can call `stop()` on a long silence. This avoids a wasted
 * round-trip when the user hesitates with the mic on.
 */
export async function startRecording(
  options: RecorderOptions = {}
): Promise<RecorderHandle> {
  const sampleRate = options.sampleRate ?? 48000;
  const silenceThreshold = options.silenceThreshold ?? 0.012;
  const autoStopSilenceMs = options.autoStopSilenceMs ?? 0;
  const maxDurationMs = options.maxDurationMs ?? 60_000;

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      channelCount: 1,
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  });

  // AudioContext can choose its own rate — we let it, then resample on encode.
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new AudioCtx();
  const source = ctx.createMediaStreamSource(stream);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 1024;
  source.connect(analyser);

  const bufferSize = 4096;
  const processor = ctx.createScriptProcessor(bufferSize, 1, 1);
  source.connect(processor);
  processor.connect(ctx.destination);

  const buffers: Float32Array[] = [];
  let totalSamples = 0;
  let level = 0;
  let recording = true;
  let silenceMs = 0;
  let lastChunkTime = performance.now();
  let resolveStop: ((blob: Blob) => void) | null = null;
  let rejectStop: ((err: Error) => void) | null = null;
  const stopPromise = new Promise<Blob>((res, rej) => {
    resolveStop = res;
    rejectStop = rej;
  });

  processor.onaudioprocess = (ev) => {
    if (!recording) return;
    const channel = ev.inputBuffer.getChannelData(0);
    // Copy because onaudioprocess buffers are recycled each tick.
    buffers.push(new Float32Array(channel));
    totalSamples += channel.length;

    let sumSq = 0;
    for (let i = 0; i < channel.length; i += 1) sumSq += channel[i] * channel[i];
    level = Math.sqrt(sumSq / channel.length);

    const now = performance.now();
    const dt = now - lastChunkTime;
    lastChunkTime = now;
    if (level < silenceThreshold) silenceMs += dt;
    else silenceMs = 0;

    if (autoStopSilenceMs > 0 && silenceMs >= autoStopSilenceMs && totalSamples > 0) {
      void finalize();
    }
    if (totalSamples / ctx.sampleRate >= maxDurationMs / 1000) {
      void finalize();
    }
  };

  const cleanup = () => {
    recording = false;
    try { processor.disconnect(); } catch {}
    try { source.disconnect(); } catch {}
    try { analyser.disconnect(); } catch {}
    stream.getTracks().forEach((t) => t.stop());
    void ctx.close();
  };

  const finalize = async () => {
    if (!recording) return;
    cleanup();
    try {
      const merged = mergeBuffers(buffers, totalSamples);
      const resampled = resampleLinear(merged, ctx.sampleRate, sampleRate);
      const wav = encodeWav(resampled, sampleRate);
      resolveStop?.(new Blob([wav], { type: "audio/wav" }));
    } catch (err) {
      rejectStop?.(err as Error);
    }
  };

  return {
    stop: () => {
      void finalize();
      return stopPromise;
    },
    cancel: () => {
      cleanup();
      rejectStop?.(new Error("Recording cancelled"));
    },
    getLevel: () => level,
    isSilent: () => level < silenceThreshold,
    isRecording: () => recording,
  };
}

function mergeBuffers(buffers: Float32Array[], total: number): Float32Array {
  const out = new Float32Array(total);
  let offset = 0;
  for (const buf of buffers) {
    out.set(buf, offset);
    offset += buf.length;
  }
  return out;
}

/** Linear resampling — lo-fi but fine for 16k speech downsampled from 48k. */
function resampleLinear(input: Float32Array, fromRate: number, toRate: number): Float32Array {
  if (fromRate === toRate) return input;
  const ratio = fromRate / toRate;
  const length = Math.floor(input.length / ratio);
  const out = new Float32Array(length);
  for (let i = 0; i < length; i += 1) {
    const idx = i * ratio;
    const left = Math.floor(idx);
    const right = Math.min(left + 1, input.length - 1);
    const frac = idx - left;
    out[i] = input[left] * (1 - frac) + input[right] * frac;
  }
  return out;
}

function encodeWav(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i += 1) view.setUint8(offset + i, str.charCodeAt(i));
  };
  writeString(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, samples.length * 2, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i += 1) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }
  return buffer;
}
