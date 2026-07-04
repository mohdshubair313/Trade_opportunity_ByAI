"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, PhoneOff, Phone, Volume2, VolumeX } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { VoiceOrb, type VoiceOrbState } from "@/components/voice/VoiceOrb";

const WS_URL = process.env.NEXT_PUBLIC_VOICE_WS_URL || "ws://localhost:8765/ws/client";
const TARGET_SAMPLE_RATE = 16000;

interface AudioQueueItem {
  audioBuffer: AudioBuffer;
  startTime: number;
}

export function VoiceAgentStream({ className }: { className?: string }) {
  const [state, setState] = useState<VoiceOrbState>("idle");
  const [muted, setMuted] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [playbackLevel, setPlaybackLevel] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const micAnalyserRef = useRef<AnalyserNode | null>(null);
  const playbackAnalyserRef = useRef<AnalyserNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const audioQueueRef = useRef<AudioQueueItem[]>([]);
  const isPlayingRef = useRef(false);
  const nextScheduledTimeRef = useRef(0);
  const micAnimFrameRef = useRef(0);
  const playbackAnimFrameRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getAudioCtx = useCallback(() => {
    if (!audioCtxRef.current) {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioCtxRef.current = new Ctx({ sampleRate: TARGET_SAMPLE_RATE });
    }
    return audioCtxRef.current;
  }, []);

  const scheduleNextAudio = useCallback(() => {
    const ctx = audioCtxRef.current;
    const queue = audioQueueRef.current;
    if (!ctx || queue.length === 0 || isPlayingRef.current) return;

    isPlayingRef.current = true;
    if (nextScheduledTimeRef.current < ctx.currentTime) {
      nextScheduledTimeRef.current = ctx.currentTime + 0.01;
    }

    while (queue.length > 0) {
      const item = queue.shift()!;
      const source = ctx.createBufferSource();
      source.buffer = item.audioBuffer;
      if (playbackAnalyserRef.current) {
        source.connect(playbackAnalyserRef.current);
        playbackAnalyserRef.current.connect(ctx.destination);
      } else {
        source.connect(ctx.destination);
      }
      source.start(nextScheduledTimeRef.current);
      nextScheduledTimeRef.current += item.audioBuffer.duration;
      source.onended = () => {
        isPlayingRef.current = false;
        if (audioQueueRef.current.length > 0) {
          scheduleNextAudio();
        } else {
          setState("idle");
        }
      };
    }
  }, []);

  const clearAudioQueue = useCallback(() => {
    audioQueueRef.current = [];
    isPlayingRef.current = false;
    nextScheduledTimeRef.current = 0;
    if (audioCtxRef.current && audioCtxRef.current.state === "running") {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
  }, []);

  const startMicAnalyser = useCallback((stream: MediaStream) => {
    const ctx = getAudioCtx();
    const source = ctx.createMediaStreamSource(stream);
    sourceRef.current = source;
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    micAnalyserRef.current = analyser;

    const data = new Uint8Array(analyser.frequencyBinCount);
    const tick = () => {
      analyser.getByteFrequencyData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) sum += data[i];
      setMicLevel(sum / data.length / 255);
      micAnimFrameRef.current = requestAnimationFrame(tick);
    };
    tick();
  }, [getAudioCtx]);

  const startPlaybackAnalyser = useCallback(() => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    playbackAnalyserRef.current = analyser;
    const data = new Uint8Array(analyser.frequencyBinCount);
    const tick = () => {
      analyser.getByteFrequencyData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) sum += data[i];
      setPlaybackLevel(sum / data.length / 255);
      playbackAnimFrameRef.current = requestAnimationFrame(tick);
    };
    tick();
  }, []);

  const startConnection = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: TARGET_SAMPLE_RATE,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      streamRef.current = stream;

      const ctx = getAudioCtx();
      const gain = ctx.createGain();
      gain.gain.value = 1;
      gainNodeRef.current = gain;

      startMicAnalyser(stream);
      startPlaybackAnalyser();

      const ws = new WebSocket(WS_URL);
      ws.binaryType = "arraybuffer";
      wsRef.current = ws;

      ws.onopen = () => {
        setState("listening");
      };

      ws.onmessage = (event) => {
        if (event.data instanceof ArrayBuffer) {
          const ctx2 = getAudioCtx();
          const int16 = new Int16Array(event.data);
          const float32 = new Float32Array(int16.length);
          for (let i = 0; i < int16.length; i++) {
            float32[i] = int16[i] / 32768;
          }
          const audioBuffer = ctx2.createBuffer(1, float32.length, TARGET_SAMPLE_RATE);
          audioBuffer.getChannelData(0).set(float32);
          audioQueueRef.current.push({ audioBuffer, startTime: ctx2.currentTime });
          if (!isPlayingRef.current) {
            scheduleNextAudio();
          }
          setState("speaking");
        } else {
          try {
            const data = JSON.parse(event.data);
            if (data.type === "clear") {
              clearAudioQueue();
              setState("listening");
            }
          } catch {}
        }
      };

      ws.onclose = () => {
        setState("idle");
        wsRef.current = null;
      };

      ws.onerror = () => {
        setState("idle");
      };

      const scriptNode = ctx.createScriptProcessor(4096, 1, 1);
      scriptProcessorRef.current = scriptNode;
      const micSource = sourceRef.current;
      if (micSource) {
        micSource.connect(scriptNode);
        // Do NOT connect scriptNode to destination — that would echo mic audio through speakers.
      }

      scriptNode.onaudioprocess = (ev) => {
        if (wsRef.current?.readyState !== WebSocket.OPEN) return;
        const input = ev.inputBuffer.getChannelData(0);
        const nativeRate = audioCtxRef.current?.sampleRate || ctx.sampleRate;
        const resampled = resampleLinear(input, nativeRate, TARGET_SAMPLE_RATE);
        const int16 = new Int16Array(resampled.length);
        for (let i = 0; i < resampled.length; i++) {
          const s = Math.max(-1, Math.min(1, resampled[i]));
          int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }
        wsRef.current.send(int16.buffer);
      };

    } catch (err) {
      console.error("Failed to start voice agent:", err);
      setState("idle");
    }
  }, [getAudioCtx, startMicAnalyser, startPlaybackAnalyser, clearAudioQueue, scheduleNextAudio]);

  const stopConnection = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({ type: "close" }));
      wsRef.current.close();
      wsRef.current = null;
    }
    cancelAnimationFrame(micAnimFrameRef.current);
    cancelAnimationFrame(playbackAnimFrameRef.current);
    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current = null;
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    clearAudioQueue();
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    micAnalyserRef.current = null;
    playbackAnalyserRef.current = null;
    setState("idle");
    setMicLevel(0);
    setPlaybackLevel(0);
  }, [clearAudioQueue]);

  useEffect(() => {
    const timer = reconnectTimerRef.current;
    return () => {
      stopConnection();
      if (timer) clearTimeout(timer);
    };
  }, [stopConnection]);

  const isConnected = state !== "idle";
  const orbState = muted ? "muted" as const : state;

  return (
    <div className={cn("flex flex-col items-center gap-6 rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(34,197,94,0.18),transparent_30%),linear-gradient(180deg,rgba(7,10,14,0.98),rgba(8,13,18,0.95))] p-8 shadow-[0_30px_120px_rgba(0,0,0,0.28)]", className)}>
      <div className="grid place-items-center">
        <VoiceOrb state={orbState} level={state === "speaking" ? playbackLevel : micLevel} size={260} />
        <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
            {state === "idle"
              ? "Press Start to speak"
              : state === "listening"
              ? "Listening..."
              : state === "speaking"
              ? muted ? "Speaking (muted)" : "AI Speaking"
              : ""}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {!isConnected ? (
          <Button variant="glow" size="lg" onClick={() => void startConnection()}>
            <Phone className="h-5 w-5" />
            Start Conversation
          </Button>
        ) : (
          <>
            <Button variant="outline" size="lg" onClick={() => setMuted((m) => !m)}>
              {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
              {muted ? "Unmute" : "Mute"}
            </Button>
            <Button variant="destructive" size="lg" onClick={stopConnection}>
              <PhoneOff className="h-5 w-5" />
              Stop
            </Button>
          </>
        )}
      </div>

      <div className="flex items-center gap-4 text-xs text-slate-500">
        <span className={cn("flex items-center gap-1", isConnected && "text-emerald-400")}>
          <span className={cn("inline-block h-2 w-2 rounded-full", isConnected ? "bg-emerald-400" : "bg-slate-600")} />
          {isConnected ? "Connected" : "Disconnected"}
        </span>
        {state === "listening" && (
          <span className="flex items-center gap-1 text-emerald-400">
            <Mic className="h-3 w-3" />
            Mic live
          </span>
        )}
        {state === "speaking" && !muted && (
          <span className="flex items-center gap-1 text-cyan-400">
            <Volume2 className="h-3 w-3" />
            AI Speaking
          </span>
        )}
      </div>
    </div>
  );
}

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
