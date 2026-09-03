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
  provider?: string;
}

/** Map voice values to their TTS provider for the synthesise pipeline. */
export const VOICE_PROVIDER_MAP: Record<string, string> = {
  thalia: "deepgram",
  zeus: "deepgram",
  arcas: "deepgram",
  nova: "openai",
  alloy: "openai",
  onyx: "openai",
  sage: "openai",
  shimmer: "openai",
  echo: "openai",
  kore: "gemini",
  leda: "gemini",
};

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
  preferredProvider?: string;
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
      preferred_provider: request.preferredProvider,
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
  preferredProvider?: string;
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
      preferred_provider: request.preferredProvider,
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

// ---------------------------------------------------------------------------
// WebSocket streaming voice agent client
// ---------------------------------------------------------------------------

export function getDefaultVoiceWsUrl(
  mode: "deepgram" | "huggingface_s2s" | "s2s" | "rest" | string = "deepgram"
): string {
  const isS2S = mode === "huggingface_s2s" || mode === "s2s";
  if (isS2S && process.env.NEXT_PUBLIC_S2S_WS_URL) {
    return process.env.NEXT_PUBLIC_S2S_WS_URL;
  }
  if (!isS2S && process.env.NEXT_PUBLIC_VOICE_WS_URL) {
    return process.env.NEXT_PUBLIC_VOICE_WS_URL;
  }

  const path = isS2S ? "/ws/s2s" : "/ws/client";
  const apiBase = process.env.NEXT_PUBLIC_API_URL;
  if (apiBase) {
    const wsBase = apiBase
      .replace(/^http:\/\//, "ws://")
      .replace(/^https:\/\//, "wss://");
    return `${wsBase.replace(/\/$/, "")}${path}`;
  }

  if (typeof window !== "undefined" && window.location) {
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${proto}//${window.location.host}${path}`;
  }

  return `ws://localhost:8765${path}`;
}

const WS_RECONNECT_MAX_ATTEMPTS = 3;
const WS_RECONNECT_BASE_DELAY = 1000;
const STREAM_TARGET_RATE = 16000;

export type VoiceStreamState =
  | "idle"
  | "listening"
  | "thinking"
  | "speaking"
  | "muted";

export interface VoiceStreamCallbacks {
  onStateChange: (state: VoiceStreamState) => void;
  onTranscript: (role: "user" | "assistant", content: string) => void;
  onMicLevel: (level: number) => void;
  onPlaybackLevel: (level: number) => void;
  onError: (error: Error) => void;
  onConnectionChange: (connected: boolean) => void;
}

export interface VoiceStreamOptions {
  wsUrl?: string;
}

/**
 * Real-time WebSocket streaming voice agent client.
 * Supports both Deepgram Streaming Agent API and Hugging Face S2S / Realtime endpoints.
 */
export class VoiceStreamClient {
  private ws: WebSocket | null = null;
  private stream: MediaStream | null = null;
  private audioCtx: AudioContext | null = null;
  private micSource: MediaStreamAudioSourceNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private micAnalyser: AnalyserNode | null = null;
  private playbackAnalyser: AnalyserNode | null = null;
  private gainNode: GainNode | null = null;
  private audioQueue: AudioBuffer[] = [];
  private isPlaying = false;
  private nextTime = 0;
  private activeSources: AudioBufferSourceNode[] = [];
  private aiSpeaking = false;
  private muted = false;
  private micAnimFrame = 0;
  private playbackAnimFrame = 0;
  private state: VoiceStreamState = "idle";
  private connected = false;
  private wsUrl: string;

  private callbacks: VoiceStreamCallbacks;

  constructor(callbacks: VoiceStreamCallbacks, options?: VoiceStreamOptions) {
    this.callbacks = callbacks;
    this.wsUrl = options?.wsUrl || getDefaultVoiceWsUrl("deepgram");
  }

  isConnected(): boolean {
    return this.connected;
  }

  isMuted(): boolean {
    return this.muted;
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    if (this.gainNode) this.gainNode.gain.value = this.muted ? 0 : 1;
    this.setState(this.muted ? "muted" : "listening");
    return this.muted;
  }

  private setState(s: VoiceStreamState) {
    this.state = s;
    this.callbacks.onStateChange(s);
  }

  private getAudioCtx(): AudioContext {
    if (!this.audioCtx) {
      const Ctx =
        window.AudioContext ||
        (window as unknown as {
          webkitAudioContext: typeof AudioContext;
        }).webkitAudioContext;
      this.audioCtx = new Ctx();
    }
    return this.audioCtx;
  }

  private scheduleNextAudio() {
    const ctx = this.audioCtx;
    if (!ctx || this.audioQueue.length === 0 || this.isPlaying) return;
    this.isPlaying = true;
    if (this.nextTime < ctx.currentTime)
      this.nextTime = ctx.currentTime + 0.01;
    while (this.audioQueue.length > 0) {
      const buf = this.audioQueue.shift()!;
      const source = ctx.createBufferSource();
      source.buffer = buf;
      if (this.playbackAnalyser) {
        source.connect(this.playbackAnalyser);
        this.playbackAnalyser.connect(ctx.destination);
      } else {
        source.connect(ctx.destination);
      }
      source.start(this.nextTime);
      this.nextTime += buf.duration;
      const s = source;
      s.onended = () => {
        this.activeSources = this.activeSources.filter((x) => x !== s);
        this.isPlaying = false;
        if (this.audioQueue.length > 0) {
          this.scheduleNextAudio();
        } else {
          this.aiSpeaking = false;
          if (this.connected) this.setState("listening");
        }
      };
      this.activeSources.push(source);
    }
  }

  private clearQueue() {
    this.audioQueue = [];
    this.isPlaying = false;
    this.nextTime = 0;
    this.activeSources.forEach((s) => {
      try {
        s.stop();
      } catch {}
    });
    this.activeSources = [];
  }

  private startMicAnalyser() {
    const ctx = this.audioCtx;
    if (!ctx || !this.micSource) return;
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    this.micSource.connect(analyser);
    this.micAnalyser = analyser;
    const data = new Uint8Array(analyser.frequencyBinCount);
    const tick = () => {
      if (!this.micAnalyser) return;
      this.micAnalyser.getByteFrequencyData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) sum += data[i];
      this.callbacks.onMicLevel(sum / data.length / 255);
      this.micAnimFrame = requestAnimationFrame(tick);
    };
    tick();
  }

  private startPlaybackAnalyser() {
    const ctx = this.audioCtx;
    if (!ctx) return;
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    this.playbackAnalyser = analyser;
    const data = new Uint8Array(analyser.frequencyBinCount);
    const tick = () => {
      if (!this.playbackAnalyser) return;
      this.playbackAnalyser.getByteFrequencyData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) sum += data[i];
      this.callbacks.onPlaybackLevel(sum / data.length / 255);
      this.playbackAnimFrame = requestAnimationFrame(tick);
    };
    tick();
  }

  async connect(): Promise<void> {
    if (this.connected) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      this.stream = stream;

      const ctx = this.getAudioCtx();
      await ctx.resume();
      const source = ctx.createMediaStreamSource(stream);
      this.micSource = source;

      const gain = ctx.createGain();
      gain.gain.value = this.muted ? 0 : 1;
      this.gainNode = gain;

      this.startMicAnalyser();
      this.startPlaybackAnalyser();

      await this._connectWebSocket(ctx, source, 0);
    } catch (err) {
      this.callbacks.onError(
        err instanceof Error ? err : new Error(String(err))
      );
      throw err;
    }
  }

  private _connectWebSocket(
    ctx: AudioContext,
    source: MediaStreamAudioSourceNode,
    attempt: number
  ): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(this.wsUrl);
      ws.binaryType = "arraybuffer";
      this.ws = ws;

      ws.onopen = () => {
        this.connected = true;
        this.callbacks.onConnectionChange(true);
        this.setState("listening");

        const nativeRate = ctx.sampleRate;
        const processor = ctx.createScriptProcessor(4096, 1, 1);
        this.processor = processor;
        source.connect(processor);
        // Do NOT connect processor to destination — that would echo mic audio through speakers.

        processor.onaudioprocess = (ev) => {
          if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
          if (this.aiSpeaking) return;
          const input = ev.inputBuffer.getChannelData(0);
          const resampled = resampleLinear(
            input,
            nativeRate,
            STREAM_TARGET_RATE
          );
          const int16 = new Int16Array(resampled.length);
          for (let i = 0; i < resampled.length; i++) {
            const s = Math.max(-1, Math.min(1, resampled[i]));
            int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
          }
          try {
            this.ws.send(int16.buffer);
          } catch {}
        };

        ws.onmessage = (event) => {
          if (event.data instanceof ArrayBuffer) {
            if (!this.audioCtx) return;
            const int16 = new Int16Array(event.data);
            const float32 = new Float32Array(int16.length);
            for (let i = 0; i < int16.length; i++)
              float32[i] = int16[i] / 32768;
            const buf = this.audioCtx.createBuffer(
              1,
              float32.length,
              STREAM_TARGET_RATE
            );
            buf.getChannelData(0).set(float32);
            this.audioQueue.push(buf);
            if (!this.isPlaying) this.scheduleNextAudio();
            this.aiSpeaking = true;
            this.setState("speaking");
          } else {
            try {
              const data = JSON.parse(event.data);
              if (data.type === "clear") {
                this.clearQueue();
                this.aiSpeaking = false;
                if (this.connected) this.setState("listening");
              } else if (data.type === "AgentStartedSpeaking") {
                this.aiSpeaking = true;
                this.setState("speaking");
              } else if (data.type === "AgentAudioDone") {
                // allow mic after playback finishes
              } else if (data.type === "ConversationText") {
                this.callbacks.onTranscript(
                  data.role || "assistant",
                  data.content || ""
                );
              } else if (data.type === "Info") {
                // Server-side info message (e.g. reconnecting)
                console.info("[voice] info:", data.content);
              } else if (data.type === "Error") {
                this.callbacks.onError(new Error(data.content || "Voice agent error"));
              }
            } catch {}
          }
        };

        ws.onclose = () => {
          this.connected = false;
          this.callbacks.onConnectionChange(false);
          this.setState("idle");
          // Auto-reconnect if not intentionally disconnected
          if (this.stream && attempt < WS_RECONNECT_MAX_ATTEMPTS) {
            const delay = WS_RECONNECT_BASE_DELAY * Math.pow(2, attempt);
            console.info(`[voice] reconnecting in ${delay}ms (attempt ${attempt + 1})`);
            setTimeout(() => {
              this._connectWebSocket(ctx, source, attempt + 1)
                .then(resolve)
                .catch(reject);
            }, delay);
          }
        };

        ws.onerror = () => {
          if (attempt === 0) reject(new Error("WebSocket connection failed"));
        };

        resolve();
      };

      ws.onerror = () => {
        if (attempt === 0) reject(new Error("WebSocket connection failed"));
      };
    });
  }

  disconnect(): void {
    this.connected = false;
    cancelAnimationFrame(this.micAnimFrame);
    cancelAnimationFrame(this.playbackAnimFrame);
    if (this.processor) {
      try {
        this.processor.disconnect();
      } catch {}
      this.processor = null;
    }
    if (this.micSource) {
      try {
        this.micSource.disconnect();
      } catch {}
      this.micSource = null;
    }
    if (this.micAnalyser) {
      try {
        this.micAnalyser.disconnect();
      } catch {}
      this.micAnalyser = null;
    }
    if (this.ws) {
      try {
        this.ws.send(JSON.stringify({ type: "close" }));
      } catch {}
      this.ws.close();
      this.ws = null;
    }
    const trackStream = this.stream;
    if (trackStream) {
      trackStream.getTracks().forEach((t: MediaStreamTrack) => t.stop());
      this.stream = null;
    }
    this.clearQueue();
    if (this.audioCtx) {
      this.audioCtx.close().catch(() => {});
      this.audioCtx = null;
    }
    this.playbackAnalyser = null;
    this.gainNode = null;
    this.aiSpeaking = false;
    this.callbacks.onMicLevel(0);
    this.callbacks.onPlaybackLevel(0);
    this.callbacks.onConnectionChange(false);
    this.setState("idle");
  }
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
  // Do NOT connect processor to destination — that would echo mic audio through speakers.

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
