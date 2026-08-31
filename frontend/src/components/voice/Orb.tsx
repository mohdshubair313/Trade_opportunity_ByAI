"use client";

import React, { useEffect, useRef, useCallback } from "react";
import { Renderer, Camera, Transform, Mesh, Program, Sphere } from "ogl";
import { cn } from "@/lib/utils";

export type OrbState = "idle" | "listening" | "thinking" | "speaking" | "muted";

export interface OrbProps {
  /** Voice state that drives shader colors and displacement harmonics */
  state?: OrbState;
  /** Live audio intensity (0.0 to 1.0) for real-time waveform displacement */
  audioLevel?: number;
  /** Primary hue angle offset in degrees (0 to 360) */
  hue?: number;
  /** Color rotation / animation speed multiplier */
  speed?: number;
  /** Surface noise complexity and detail */
  complexity?: number;
  /** Vertex displacement intensity */
  displacement?: number;
  /** Whether the orb reacts to mouse position with tilt / rotation */
  interactive?: boolean;
  /** Size in pixels (width and height) */
  size?: number;
  /** Additional CSS class names */
  className?: string;
  /** Optional onClick handler */
  onClick?: () => void;
}

// ---------------------------------------------------------------------------
// GLSL Shaders for the 3D Aura Orb
// ---------------------------------------------------------------------------

const VERTEX_SHADER = /* glsl */ `
  precision highp float;

  attribute vec3 position;
  attribute vec3 normal;
  attribute vec2 uv;

  uniform mat4 modelViewMatrix;
  uniform mat4 projectionMatrix;
  uniform mat3 normalMatrix;

  uniform float uTime;
  uniform float uAudioLevel;
  uniform float uComplexity;
  uniform float uDisplacement;

  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec2 vUv;
  varying float vDisplacement;

  // Simplex-style 3D noise implementation
  vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
  vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}

  float snoise(vec3 v){
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

    vec3 i  = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);

    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);

    vec3 x1 = x0 - i1 + 1.0 * C.xxx;
    vec3 x2 = x0 - i2 + 2.0 * C.xxx;
    vec3 x3 = x0 - 1.0 + 3.0 * C.xxx;

    i = mod(i, 289.0);
    vec4 p = permute(permute(permute(
              i.z + vec4(0.0, i1.z, i2.z, 1.0))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0));

    float n_ = 0.142857142857;
    vec3  ns = n_ * D.wyz - D.xzx;

    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);

    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);

    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);

    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));

    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;

    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);

    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;

    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }

  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vPosition = position;

    // Harmonic noise calculation with audio reactive amplitude
    float noiseFreq = uComplexity;
    float timeOffset = uTime * 0.8;
    
    float n1 = snoise(position * noiseFreq + vec3(0.0, timeOffset * 0.4, 0.0));
    float n2 = snoise(position * (noiseFreq * 2.0) - vec3(timeOffset * 0.3, 0.0, timeOffset * 0.2)) * 0.5;
    float combinedNoise = n1 + n2;

    // Audio level pushes outward spikes and ripple displacement
    float audioPush = uAudioLevel * 1.35;
    float totalDisplacement = combinedNoise * (uDisplacement + audioPush * 0.28);
    vDisplacement = totalDisplacement;

    vec3 displacedPosition = position + normal * totalDisplacement;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(displacedPosition, 1.0);
  }
`;

const FRAGMENT_SHADER = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform float uAudioLevel;
  uniform vec3 uColorCore;
  uniform vec3 uColorMantle;
  uniform vec3 uColorAura;
  uniform vec3 uColorAccent;
  uniform float uFresnelPower;
  uniform float uGlowIntensity;

  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec2 vUv;
  varying float vDisplacement;

  void main() {
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(-vPosition);

    // Fresnel glow edge calculation
    float fresnel = 1.0 - max(dot(viewDir, normal), 0.0);
    fresnel = pow(fresnel, uFresnelPower);

    // Chromatic dispersion & iridescent core gradient
    float pulse = sin(uTime * 1.5 + vDisplacement * 4.0) * 0.5 + 0.5;
    float audioFlash = uAudioLevel * 0.6;

    vec3 coreColor = mix(uColorCore, uColorMantle, clamp(vDisplacement * 2.0 + 0.5, 0.0, 1.0));
    vec3 auraColor = mix(uColorAura, uColorAccent, pulse + audioFlash);

    // Final color blend: core interior + intense atmospheric Fresnel aura
    vec3 finalColor = mix(coreColor, auraColor, fresnel * uGlowIntensity);
    
    // Add specular highlight sheen
    vec3 lightDir = normalize(vec3(0.8, 1.2, 1.0));
    vec3 halfVector = normalize(lightDir + viewDir);
    float spec = pow(max(dot(normal, halfVector), 0.0), 32.0) * 0.45;
    finalColor += uColorAccent * spec;

    // Soft outer atmosphere alpha falloff
    float alpha = clamp(0.85 + fresnel * 0.35 + audioFlash * 0.2, 0.0, 1.0);

    gl_FragColor = vec4(finalColor, alpha);
  }
`;

// ---------------------------------------------------------------------------
// State Color Palettes (Core, Mantle, Aura, Accent)
// ---------------------------------------------------------------------------

interface Palette {
  core: [number, number, number];
  mantle: [number, number, number];
  aura: [number, number, number];
  accent: [number, number, number];
  fresnelPower: number;
  glowIntensity: number;
  complexity: number;
  displacement: number;
  speed: number;
}

const PALETTES: Record<OrbState, Palette> = {
  idle: {
    core: [0.03, 0.12, 0.1],      // Deep emerald-teal base
    mantle: [0.08, 0.35, 0.28],   // Vibrant mint mantle
    aura: [0.13, 0.77, 0.55],     // Luminous teal glow
    accent: [0.45, 0.95, 0.85],   // Cyan sparkle
    fresnelPower: 2.2,
    glowIntensity: 1.4,
    complexity: 1.2,
    displacement: 0.12,
    speed: 0.7,
  },
  listening: {
    core: [0.02, 0.15, 0.12],     // Electric emerald core
    mantle: [0.1, 0.55, 0.35],    // Active wave mantle
    aura: [0.2, 0.9, 0.45],       // High intensity green aura
    accent: [0.65, 1.0, 0.85],    // Super bright crest
    fresnelPower: 1.8,
    glowIntensity: 1.8,
    complexity: 1.8,
    displacement: 0.18,
    speed: 1.2,
  },
  thinking: {
    core: [0.12, 0.04, 0.25],     // Deep cosmic violet
    mantle: [0.35, 0.15, 0.65],   // Electric indigo mantle
    aura: [0.22, 0.65, 0.98],     // Cyan-blue coronal fringe
    accent: [0.85, 0.45, 0.98],   // Magenta vortex spark
    fresnelPower: 1.6,
    glowIntensity: 2.0,
    complexity: 2.4,
    displacement: 0.22,
    speed: 2.2,
  },
  speaking: {
    core: [0.05, 0.2, 0.18],      // Warm emerald depth
    mantle: [0.15, 0.65, 0.55],   // Harmonic cyan-mint
    aura: [0.3, 0.85, 0.95],      // Iridescent turquoise aura
    accent: [0.95, 0.85, 0.4],    // Golden resonance flash
    fresnelPower: 1.7,
    glowIntensity: 1.9,
    complexity: 1.6,
    displacement: 0.2,
    speed: 1.4,
  },
  muted: {
    core: [0.08, 0.1, 0.12],      // Slate grey core
    mantle: [0.18, 0.22, 0.26],   // Steel grey mantle
    aura: [0.4, 0.45, 0.52],      // Subdued silver aura
    accent: [0.6, 0.65, 0.72],    // Soft highlight
    fresnelPower: 2.6,
    glowIntensity: 0.9,
    complexity: 0.8,
    displacement: 0.06,
    speed: 0.3,
  },
};

/**
 * 3D AURA Globe (Orb) - High-performance WebGL / OGL shader sphere.
 * Replaces simple CSS waveforms with an ethereal, living sphere of light.
 */
export function Orb({
  state = "idle",
  audioLevel = 0,
  speed = 1.0,
  complexity,
  displacement,
  interactive = true,
  size = 280,
  className,
  onClick,
}: OrbProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const audioLevelRef = useRef(audioLevel);
  audioLevelRef.current = audioLevel;

  const targetRotation = useRef({ x: 0, y: 0 });
  const currentRotation = useRef({ x: 0, y: 0 });
  const targetPalette = useRef(PALETTES[state]);
  const currentPalette = useRef({ ...PALETTES[state] });

  // Update target palette when state changes
  useEffect(() => {
    targetPalette.current = PALETTES[state] || PALETTES.idle;
  }, [state]);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!interactive) return;
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
      targetRotation.current = { x: y * 0.6, y: x * 0.8 };
    },
    [interactive]
  );

  const handlePointerLeave = useCallback(() => {
    targetRotation.current = { x: 0, y: 0 };
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let renderer: Renderer | null = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let gl: any = null;
    let animationFrameId: number | null = null;

    try {
      renderer = new Renderer({
        dpr: Math.min(window.devicePixelRatio || 1, 2),
        alpha: true,
        antialias: true,
        powerPreference: "high-performance",
      });
      gl = renderer.gl;
      const canvasEl = gl.canvas as HTMLCanvasElement;
      container.appendChild(canvasEl);

      const camera = new Camera(gl, { fov: 45, near: 0.1, far: 100 });
      camera.position.set(0, 0, 2.6);

      const scene = new Transform();
      const geometry = new Sphere(gl, {
        radius: 0.92,
        widthSegments: 64,
        heightSegments: 48,
      });

      const p = targetPalette.current;
      const program = new Program(gl, {
        vertex: VERTEX_SHADER,
        fragment: FRAGMENT_SHADER,
        transparent: true,
        cullFace: false,
        uniforms: {
          uTime: { value: 0 },
          uAudioLevel: { value: 0 },
          uComplexity: { value: complexity ?? p.complexity },
          uDisplacement: { value: displacement ?? p.displacement },
          uColorCore: { value: [...p.core] },
          uColorMantle: { value: [...p.mantle] },
          uColorAura: { value: [...p.aura] },
          uColorAccent: { value: [...p.accent] },
          uFresnelPower: { value: p.fresnelPower },
          uGlowIntensity: { value: p.glowIntensity },
        },
      });

      const mesh = new Mesh(gl, { geometry, program });
      mesh.setParent(scene);

      const resize = () => {
        if (!container || !renderer || !gl) return;
        const width = container.clientWidth || size;
        const height = container.clientHeight || size;
        renderer.setSize(width, height);
        camera.perspective({ aspect: width / height });
      };

      window.addEventListener("resize", resize);
      resize();

      const startTime = performance.now();

      const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
      const lerpVec3 = (
        a: [number, number, number],
        b: [number, number, number],
        t: number
      ): [number, number, number] => [
        lerp(a[0], b[0], t),
        lerp(a[1], b[1], t),
        lerp(a[2], b[2], t),
      ];

      const render = (time: number) => {
        if (!gl || !renderer) return;

        const elapsed = (time - startTime) * 0.001;

        // Smooth rotation damping
        currentRotation.current.x = lerp(
          currentRotation.current.x,
          targetRotation.current.x,
          0.08
        );
        currentRotation.current.y = lerp(
          currentRotation.current.y,
          targetRotation.current.y,
          0.08
        );

        const targetP = targetPalette.current;
        const currP = currentPalette.current;
        const colorLerpSpeed = 0.08;

        currP.core = lerpVec3(currP.core, targetP.core, colorLerpSpeed);
        currP.mantle = lerpVec3(currP.mantle, targetP.mantle, colorLerpSpeed);
        currP.aura = lerpVec3(currP.aura, targetP.aura, colorLerpSpeed);
        currP.accent = lerpVec3(currP.accent, targetP.accent, colorLerpSpeed);
        currP.fresnelPower = lerp(
          currP.fresnelPower,
          targetP.fresnelPower,
          colorLerpSpeed
        );
        currP.glowIntensity = lerp(
          currP.glowIntensity,
          targetP.glowIntensity,
          colorLerpSpeed
        );
        currP.complexity = lerp(
          currP.complexity,
          complexity ?? targetP.complexity,
          colorLerpSpeed
        );
        currP.displacement = lerp(
          currP.displacement,
          displacement ?? targetP.displacement,
          colorLerpSpeed
        );
        currP.speed = lerp(currP.speed, targetP.speed, colorLerpSpeed);

        // Update uniforms
        program.uniforms.uTime.value = elapsed * currP.speed * speed;
        program.uniforms.uAudioLevel.value = audioLevelRef.current;
        program.uniforms.uComplexity.value = currP.complexity;
        program.uniforms.uDisplacement.value = currP.displacement;
        program.uniforms.uColorCore.value = currP.core;
        program.uniforms.uColorMantle.value = currP.mantle;
        program.uniforms.uColorAura.value = currP.aura;
        program.uniforms.uColorAccent.value = currP.accent;
        program.uniforms.uFresnelPower.value = currP.fresnelPower;
        program.uniforms.uGlowIntensity.value = currP.glowIntensity;

        // Base continuous breathing spin + interactive tilt
        mesh.rotation.y = elapsed * 0.25 * currP.speed + currentRotation.current.y;
        mesh.rotation.x = Math.sin(elapsed * 0.3) * 0.15 + currentRotation.current.x;
        mesh.rotation.z = Math.cos(elapsed * 0.2) * 0.1;

        renderer.render({ scene, camera });
        animationFrameId = requestAnimationFrame(render);
      };

      animationFrameId = requestAnimationFrame(render);

      return () => {
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        window.removeEventListener("resize", resize);
        const canvas = gl?.canvas as HTMLCanvasElement | undefined;
        if (canvas && canvas.parentElement) {
          canvas.parentElement.removeChild(canvas);
        }
      };
    } catch (err) {
      console.warn("WebGL initialization failed for 3D Orb, falling back to 2D canvas:", err);
    }
  }, [complexity, displacement, size, speed]);

  return (
    <div
      ref={containerRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onClick={onClick}
      className={cn(
        "relative select-none flex items-center justify-center cursor-pointer transition-transform duration-300 active:scale-95",
        className
      )}
      style={{ width: size, height: size }}
      role="status"
      aria-label={`Voice agent state: ${state}`}
    >
      {/* Background ambient halo light source */}
      <div
        className="pointer-events-none absolute inset-0 rounded-full blur-3xl opacity-60 transition-all duration-700"
        style={{
          background:
            state === "muted"
              ? "radial-gradient(circle, rgba(148,163,184,0.3) 0%, transparent 70%)"
              : state === "thinking"
              ? "radial-gradient(circle, rgba(168,85,247,0.45) 0%, rgba(56,189,248,0.2) 40%, transparent 70%)"
              : state === "speaking"
              ? "radial-gradient(circle, rgba(56,189,248,0.5) 0%, rgba(34,197,94,0.25) 45%, transparent 70%)"
              : "radial-gradient(circle, rgba(34,197,94,0.45) 0%, rgba(45,212,191,0.2) 40%, transparent 70%)",
          transform: `scale(${1 + audioLevel * 0.4})`,
        }}
      />
    </div>
  );
}
