import React from "react";

export interface IconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
  size?: number | string;
}

// 1. Intelligence Logo / Quantum Signal Glyph
export function LogoGlyph({ className = "w-4 h-4 text-[#1FE0A8]", size, ...props }: IconProps) {
  return (
    <svg
      width={size || 24}
      height={size || 24}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <path d="M12 2L2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    </svg>
  );
}

// 2. Terminal Live Prompt Icon
export function TerminalPromptIcon({ className = "w-4 h-4 text-[#1FE0A8]", size, ...props }: IconProps) {
  return (
    <svg
      width={size || 24}
      height={size || 24}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <polyline points="4 17 10 11 4 5" />
      <line x1="12" y1="19" x2="20" y2="19" strokeWidth="2.5" />
    </svg>
  );
}

// 3. AI Cascade & Neural Router Icon (Features #1)
export function CascadeNetworkIcon({ className = "w-5 h-5 text-[#1FE0A8]", size, ...props }: IconProps) {
  return (
    <svg
      width={size || 24}
      height={size || 24}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <rect x="2" y="3" width="6" height="6" rx="1.5" />
      <rect x="16" y="3" width="6" height="6" rx="1.5" />
      <rect x="9" y="15" width="6" height="6" rx="1.5" />
      <path d="M5 9v3a2 2 0 0 0 2 2h2" />
      <path d="M19 9v3a2 2 0 0 1-2 2h-2" />
      <circle cx="12" cy="18" r="1" fill="currentColor" />
    </svg>
  );
}

// 4. Memory Bank & Ticker Watchlist Cache (Features #2)
export function VectorCacheIcon({ className = "w-5 h-5 text-[#1FE0A8]", size, ...props }: IconProps) {
  return (
    <svg
      width={size || 24}
      height={size || 24}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
      <line x1="12" y1="5" x2="12" y2="19" strokeDasharray="2 2" />
    </svg>
  );
}

// 5. Cost-Aware Ultra-Low Latency Engine (Features #3)
export function LatencyMatrixIcon({ className = "w-5 h-5 text-[#1FE0A8]", size, ...props }: IconProps) {
  return (
    <svg
      width={size || 24}
      height={size || 24}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
      <path d="M8 2h8" />
      <path d="M9 18l3-3 3 3" />
    </svg>
  );
}

// 6. Audited Citation Shield (Features #4)
export function CitationShieldIcon({ className = "w-5 h-5 text-[#1FE0A8]", size, ...props }: IconProps) {
  return (
    <svg
      width={size || 24}
      height={size || 24}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

// 7. Radar Sector Scanner (HowItWorks #1)
export function SectorScannerIcon({ className = "w-5 h-5 text-[#1FE0A8]", size, ...props }: IconProps) {
  return (
    <svg
      width={size || 24}
      height={size || 24}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" fill="currentColor" />
      <line x1="12" y1="12" x2="20" y2="4" strokeWidth="2" />
    </svg>
  );
}

// 8. 6-Pipeline Research Cluster (HowItWorks #2)
export function PipelineClusterIcon({ className = "w-5 h-5 text-[#1FE0A8]", size, ...props }: IconProps) {
  return (
    <svg
      width={size || 24}
      height={size || 24}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <rect x="4" y="4" width="6" height="6" rx="1.5" />
      <rect x="14" y="4" width="6" height="6" rx="1.5" />
      <rect x="4" y="14" width="6" height="6" rx="1.5" />
      <rect x="14" y="14" width="6" height="6" rx="1.5" />
      <circle cx="12" cy="12" r="2" fill="currentColor" />
    </svg>
  );
}

// 9. Multimodal Tone Synthesizer (HowItWorks #3)
export function SynthesizerIcon({ className = "w-5 h-5 text-[#1FE0A8]", size, ...props }: IconProps) {
  return (
    <svg
      width={size || 24}
      height={size || 24}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <path d="M12 18v-4" />
      <path d="M9 15h6" />
      <circle cx="12" cy="12" r="0.5" fill="currentColor" />
    </svg>
  );
}

// 10. Omnichannel Dispatcher (HowItWorks #4)
export function OmnichannelIcon({ className = "w-5 h-5 text-[#1FE0A8]", size, ...props }: IconProps) {
  return (
    <svg
      width={size || 24}
      height={size || 24}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2a10 10 0 0 1 10 10" />
      <path d="M12 6a6 6 0 0 1 6 6" />
      <path d="M2 12a10 10 0 0 1 10-10" />
      <path d="M6 12a6 6 0 0 1 6-6" />
      <path d="M12 22a10 10 0 0 1-10-10" />
      <path d="M12 18a6 6 0 0 1-6-6" />
    </svg>
  );
}

// 11. Day Trader Momentum Candlestick (Persona #1)
export function DayTraderIcon({ className = "w-5 h-5 text-[#1FE0A8]", size, ...props }: IconProps) {
  return (
    <svg
      width={size || 24}
      height={size || 24}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <path d="M5 3v18" />
      <rect x="3" y="7" width="4" height="10" rx="1" fill="currentColor" fillOpacity="0.2" />
      <path d="M12 5v14" />
      <rect x="10" y="9" width="4" height="6" rx="1" />
      <path d="M19 2v20" />
      <rect x="17" y="4" width="4" height="12" rx="1" fill="currentColor" fillOpacity="0.2" />
    </svg>
  );
}

// 12. Investor Compounding Growth (Persona #2)
export function LongInvestorIcon({ className = "w-5 h-5 text-[#E8A33D]", size, ...props }: IconProps) {
  return (
    <svg
      width={size || 24}
      height={size || 24}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
      <circle cx="6" cy="18" r="2" />
      <circle cx="18" cy="6" r="2" />
    </svg>
  );
}

// 13. SME & Exporter Supply Chain (Persona #3)
export function SmeExporterIcon({ className = "w-5 h-5 text-[#67A3A6]", size, ...props }: IconProps) {
  return (
    <svg
      width={size || 24}
      height={size || 24}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <rect x="1" y="3" width="15" height="13" rx="2" />
      <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
      <circle cx="5.5" cy="18.5" r="2.5" />
      <circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  );
}

// 14. Strategy Consultant Deep Dive (Persona #4)
export function StratConsultantIcon({ className = "w-5 h-5 text-[#3DBEA3]", size, ...props }: IconProps) {
  return (
    <svg
      width={size || 24}
      height={size || 24}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
      <line x1="8" y1="11" x2="14" y2="11" />
      <line x1="11" y1="8" x2="11" y2="14" />
    </svg>
  );
}

// 15. Live Web Report Stream (Deliverables #1)
export function StreamingWebIcon({ className = "w-5 h-5 text-[#1FE0A8]", size, ...props }: IconProps) {
  return (
    <svg
      width={size || 24}
      height={size || 24}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
      <polyline points="6 9 9 12 6 15" />
      <line x1="12" y1="15" x2="16" y2="15" />
    </svg>
  );
}

// 16. Voice Narration Waveform (Deliverables #2)
export function VoiceWaveformIcon({ className = "w-5 h-5 text-[#1FE0A8]", size, ...props }: IconProps) {
  return (
    <svg
      width={size || 24}
      height={size || 24}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="22" />
      <line x1="8" y1="22" x2="16" y2="22" />
    </svg>
  );
}

// 17. 1-Click Document Exporter (Deliverables #3)
export function DocBundleIcon({ className = "w-5 h-5 text-[#1FE0A8]", size, ...props }: IconProps) {
  return (
    <svg
      width={size || 24}
      height={size || 24}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}
