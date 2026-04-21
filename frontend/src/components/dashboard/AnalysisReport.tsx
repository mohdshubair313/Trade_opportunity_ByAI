"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useScroll, useSpring } from "framer-motion";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import {
  FileText,
  Download,
  Share2,
  Star,
  Copy,
  Check,
  Clock,
  Globe,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  ExternalLink,
  List,
  Link as LinkIcon,
  Sparkles,
  CloudDownload,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { cn, formatDate } from "@/lib/utils";
import { AnalysisResponse, AnalysisSource, exportAnalysis, ExportFormat } from "@/lib/api";
import { useFavorites } from "@/hooks/useFavorites";
import toast from "react-hot-toast";

interface AnalysisReportProps {
  analysis: AnalysisResponse;
}

// Section-type detection from heading text — used to render coloured callout
// blocks for the three section families that make up every report.
type SectionKind = "opportunity" | "risk" | "recommendation" | null;

function detectSectionKind(text: string): SectionKind {
  const t = text.toLowerCase();
  if (/\b(opportunit|growth|catalyst|upside)\b/.test(t)) return "opportunity";
  if (/\b(risk|challenge|headwind|concern|downside)\b/.test(t)) return "risk";
  if (/\b(recommend|strateg|action|playbook|suggest)\b/.test(t)) return "recommendation";
  return null;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);
}

// Lift every h2 out of the markdown to build a sticky ToC without round-tripping
// through the DOM after render.
function extractHeadings(markdown: string): { text: string; slug: string; kind: SectionKind }[] {
  const lines = markdown.split("\n");
  const out: { text: string; slug: string; kind: SectionKind }[] = [];
  for (const raw of lines) {
    const m = raw.match(/^##\s+(.+?)\s*$/);
    if (!m) continue;
    const text = m[1].replace(/\[[\d\s,]+\]/g, "").trim();
    out.push({ text, slug: slugify(text), kind: detectSectionKind(text) });
  }
  return out;
}

export function AnalysisReport({ analysis }: AnalysisReportProps) {
  const [copied, setCopied] = useState(false);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [downloading, setDownloading] = useState<ExportFormat | null>(null);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const { isFavorite: checkFavorite, toggleFavorite } = useFavorites();
  const isFavorite = checkFavorite(analysis.sector);

  const cardRef = useRef<HTMLDivElement | null>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);

  // Reading-progress bar tied to how far into the report you've scrolled.
  const { scrollYProgress } = useScroll({
    target: cardRef,
    offset: ["start center", "end end"],
  });
  const progressX = useSpring(scrollYProgress, {
    stiffness: 140,
    damping: 26,
    mass: 0.35,
  });

  // Sources indexed for fast lookup by the ReactMarkdown link renderer.
  const sourcesById = useMemo(() => {
    const map = new Map<number, AnalysisSource>();
    analysis.sources?.forEach((s) => map.set(s.n, s));
    return map;
  }, [analysis.sources]);

  // Pre-compute the ToC off the raw markdown — stable across renders.
  const toc = useMemo(() => extractHeadings(analysis.report), [analysis.report]);

  // Rewrite inline [N] tokens into markdown links pointing at the cited source.
  // Anchor hrefs (#src-N) are recognised by the link renderer and turned into
  // citation chips with a hover preview.
  const reportWithCitations = useMemo(() => {
    if (!analysis.sources || analysis.sources.length === 0) return analysis.report;
    return analysis.report.replace(/\[(\d+)\]/g, (whole, numStr: string) => {
      const n = Number(numStr);
      return sourcesById.has(n) ? `[\\[${n}\\]](#src-${n})` : whole;
    });
  }, [analysis.report, analysis.sources, sourcesById]);

  // Pull a short "key idea" line out of the report — rendered in the exec-summary
  // hero as a pull quote. Heuristic: first non-heading sentence in the first
  // ~1200 chars of the report.
  const heroTakeaway = useMemo(() => {
    const trimmed = analysis.report.slice(0, 1200).replace(/^---[\s\S]*?---/, "");
    const lines = trimmed
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("#") && !l.startsWith("|") && l.length > 40);
    return lines[0]?.replace(/\[(\d+)\]/g, "").slice(0, 240) || "";
  }, [analysis.report]);

  // Track which section is currently in view for ToC highlighting.
  useEffect(() => {
    if (!toc.length) return;
    const headingEls = toc
      .map((h) => bodyRef.current?.querySelector(`#${h.slug}`))
      .filter(Boolean) as HTMLElement[];
    if (!headingEls.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.target.getBoundingClientRect().top - b.target.getBoundingClientRect().top);
        if (visible.length) {
          setActiveSection(visible[0].target.id);
        }
      },
      { rootMargin: "-20% 0px -60% 0px", threshold: [0, 1] },
    );
    headingEls.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [toc]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(analysis.report);
    setCopied(true);
    toast.success("Report copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const safeSector = analysis.sector.toLowerCase().replace(/\s+/g, "-");
  const today = new Date().toISOString().split("T")[0];

  const handleDownloadMarkdown = () => {
    const blob = new Blob([analysis.report], { type: "text/markdown" });
    downloadBlob(blob, `${safeSector}-analysis-${today}.md`);
    toast.success("Markdown downloaded");
    setDownloadOpen(false);
  };

  const handleDownloadServer = async (fmt: ExportFormat) => {
    if (!analysis.id) {
      toast.error("Save this analysis first — only stored analyses can be exported");
      return;
    }
    setDownloading(fmt);
    try {
      const blob = await exportAnalysis(analysis.id, fmt);
      downloadBlob(blob, `${safeSector}-analysis-${today}.${fmt}`);
      toast.success(`${fmt.toUpperCase()} downloaded`);
      setDownloadOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Could not export ${fmt}`);
    } finally {
      setDownloading(null);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${analysis.sector} Market Analysis`,
          text: analysis.report.slice(0, 200) + "...",
        });
        return;
      } catch {
        /* fall through */
      }
    }
    handleCopy();
  };

  const jumpToSection = (slug: string) => {
    const el = bodyRef.current?.querySelector<HTMLElement>(`#${slug}`);
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY - 96;
    window.scrollTo({ top: y, behavior: "smooth" });
  };

  // Render kinds in the ToC so the user sees which section is which at a glance.
  const tocIcon = (kind: SectionKind) => {
    if (kind === "opportunity") return <TrendingUp className="h-3 w-3 text-emerald-500" />;
    if (kind === "risk") return <AlertTriangle className="h-3 w-3 text-amber-500" />;
    if (kind === "recommendation") return <Lightbulb className="h-3 w-3 text-sky-500" />;
    return <span className="h-1 w-1 rounded-full bg-muted-foreground/40" />;
  };

  // ReactMarkdown component map — this is where the heavy lifting for
  // visual polish lives. Headings get anchors + accent markers, list items
  // get custom bullets, blockquotes get gradient accents, etc.
  const components: Components = useMemo(() => ({
    h1: ({ children }) => {
      const text = typeof children === "string" ? children : String(children);
      const slug = slugify(text);
      return (
        <h1 id={slug} className="group text-3xl md:text-4xl font-semibold tracking-tight mb-6 mt-2 text-foreground">
          {children}
          <AnchorLink slug={slug} />
        </h1>
      );
    },
    h2: ({ children }) => {
      const text = typeof children === "string" ? children : String(children);
      const slug = slugify(text);
      const kind = detectSectionKind(text);
      return (
        <h2
          id={slug}
          className={cn(
            "group scroll-mt-24 flex items-center gap-3 text-2xl font-semibold tracking-tight mt-14 mb-5",
            kind === "opportunity" && "text-emerald-400",
            kind === "risk" && "text-amber-400",
            kind === "recommendation" && "text-sky-400",
            !kind && "text-foreground",
          )}
        >
          <span
            className={cn(
              "inline-block w-1 h-7 rounded-full",
              kind === "opportunity" && "bg-emerald-500",
              kind === "risk" && "bg-amber-500",
              kind === "recommendation" && "bg-sky-500",
              !kind && "bg-primary",
            )}
          />
          {children}
          <AnchorLink slug={slug} />
        </h2>
      );
    },
    h3: ({ children }) => {
      const text = typeof children === "string" ? children : String(children);
      const slug = slugify(text);
      return (
        <h3 id={slug} className="group scroll-mt-24 text-lg font-semibold tracking-tight mt-8 mb-3 text-foreground">
          {children}
          <AnchorLink slug={slug} />
        </h3>
      );
    },
    p: ({ children }) => (
      <p className="my-4 text-[15px] leading-[1.75] text-foreground/80">{children}</p>
    ),
    ul: ({ children }) => (
      <ul className="my-5 space-y-2.5 list-none pl-0">{children}</ul>
    ),
    ol: ({ children }) => (
      <ol className="my-5 space-y-2.5 list-decimal pl-6 text-[15px] text-foreground/85 marker:text-muted-foreground">
        {children}
      </ol>
    ),
    li: ({ children }) => (
      <li className="flex items-start gap-3 text-[15px] leading-[1.7] text-foreground/85">
        <span className="mt-[0.55em] h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary/70" />
        <span className="flex-1">{children}</span>
      </li>
    ),
    strong: ({ children }) => (
      <strong className="font-semibold text-foreground">{children}</strong>
    ),
    em: ({ children }) => (
      <em className="italic text-foreground/90">{children}</em>
    ),
    blockquote: ({ children }) => (
      <blockquote className="relative my-6 rounded-r-xl border-l-[3px] border-primary bg-primary/[0.04] px-5 py-4 text-[15px] leading-relaxed text-foreground/85">
        {children}
      </blockquote>
    ),
    code: ({ children }) => (
      <code className="rounded bg-muted px-1.5 py-0.5 text-[0.875em] font-mono text-foreground">
        {children}
      </code>
    ),
    pre: ({ children }) => (
      <pre className="my-5 overflow-x-auto rounded-xl border border-border bg-muted/40 p-4 text-[13px] leading-relaxed">
        {children}
      </pre>
    ),
    hr: () => <hr className="my-10 border-border/60" />,
    table: ({ children }) => (
      <div className="my-6 overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">{children}</table>
      </div>
    ),
    thead: ({ children }) => (
      <thead className="bg-muted/40 text-foreground">{children}</thead>
    ),
    th: ({ children }) => (
      <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td className="border-t border-border/70 px-4 py-3 text-foreground/85">{children}</td>
    ),
    a: ({ href, children }) => {
      const citationMatch = href?.match(/^#src-(\d+)$/);
      if (citationMatch) {
        const n = Number(citationMatch[1]);
        const source = sourcesById.get(n);
        if (!source) return <>{children}</>;
        return <CitationChip n={n} source={source} />;
      }
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          {children}
        </a>
      );
    },
  }), [sourcesById]);

  const sections = {
    hasOpportunities: analysis.report.toLowerCase().includes("opportunit"),
    hasRisks: /\b(risk|challenge)\b/i.test(analysis.report),
    hasRecommendations: /\brecommend/i.test(analysis.report),
  };

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-[28px] border border-border bg-card"
    >
      {/* Reading progress bar — tracks scroll from the header of this card to
          the end of the sources block. */}
      <motion.div
        style={{ scaleX: progressX, transformOrigin: "0% 50%" }}
        className="absolute left-0 right-0 top-0 z-20 h-[2px] bg-gradient-to-r from-primary via-emerald-400 to-primary/80 pointer-events-none"
      />

      {/* ── Header ────────────────────────────────────────────────────── */}
      <ReportHeader
        analysis={analysis}
        isFavorite={isFavorite}
        onFavorite={() => toggleFavorite(analysis.sector)}
        onCopy={handleCopy}
        onShare={handleShare}
        onToggleDownload={() => setDownloadOpen((v) => !v)}
        downloadOpen={downloadOpen}
        onClickOutsideDownload={() => setDownloadOpen(false)}
        downloading={downloading}
        copied={copied}
        onDownloadMarkdown={handleDownloadMarkdown}
        onDownloadServer={handleDownloadServer}
        sections={sections}
      />

      {/* ── Body ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[220px,1fr] gap-0">
        {/* Sticky ToC on desktop */}
        {toc.length >= 2 && (
          <aside className="hidden lg:block border-r border-border/60 bg-card/60">
            <div className="sticky top-6 p-6">
              <div className="flex items-center gap-2 mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                <List className="h-3.5 w-3.5" />
                On this page
              </div>
              <nav className="space-y-0.5">
                {toc.map((h) => (
                  <button
                    key={h.slug}
                    type="button"
                    onClick={() => jumpToSection(h.slug)}
                    className={cn(
                      "group flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] leading-snug transition-colors",
                      activeSection === h.slug
                        ? "bg-primary/8 text-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/40",
                    )}
                  >
                    <span className="flex-shrink-0">{tocIcon(h.kind)}</span>
                    <span className="flex-1 truncate">{h.text}</span>
                  </button>
                ))}
                {sourcesById.size > 0 && (
                  <button
                    type="button"
                    onClick={() => jumpToSection("sources")}
                    className={cn(
                      "group mt-2 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] leading-snug transition-colors border-t border-border/60 pt-3",
                      activeSection === "sources"
                        ? "bg-primary/8 text-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/40",
                    )}
                  >
                    <LinkIcon className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
                    Sources ({sourcesById.size})
                  </button>
                )}
              </nav>
            </div>
          </aside>
        )}

        {/* Reading column */}
        <div ref={bodyRef} className="px-6 md:px-10 py-8 md:py-12">
          {/* Executive summary hero — the first thing the reader's eye lands on */}
          {heroTakeaway && (
            <div className="mb-10 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/[0.06] to-transparent p-6">
              <div className="flex items-center gap-2 mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                Key takeaway
              </div>
              <p className="text-[17px] md:text-[18px] leading-[1.6] text-foreground/90 font-display italic">
                “{heroTakeaway.replace(/^["'\u201c\u201d]/, "").replace(/["'\u201c\u201d]$/, "")}”
              </p>
              <div className="mt-5 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  {analysis.sources_analyzed} sources analysed
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-3 w-3" />
                  {formatDate(analysis.timestamp)}
                </span>
                {analysis.saved_url && (
                  <a
                    href={analysis.saved_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-primary hover:underline"
                  >
                    <CloudDownload className="h-3 w-3" />
                    Saved copy
                  </a>
                )}
              </div>
            </div>
          )}

          {/* The report itself — prose wrapped with our custom components */}
          <article className="max-w-[72ch]">
            <ReactMarkdown components={components}>
              {reportWithCitations}
            </ReactMarkdown>
          </article>

          {/* Sources */}
          {analysis.sources && analysis.sources.length > 0 && (
            <section id="sources" className="scroll-mt-24 mt-14 pt-8 border-t border-border/60">
              <div className="flex items-center gap-2 mb-5">
                <Globe className="h-4 w-4 text-primary" />
                <h3 className="text-lg font-semibold text-foreground">
                  Sources <span className="text-muted-foreground font-normal">· {analysis.sources.length}</span>
                </h3>
              </div>
              <ol className="grid grid-cols-1 md:grid-cols-2 gap-3 list-none p-0">
                {analysis.sources.map((source) => (
                  <li
                    key={source.n}
                    id={`src-${source.n}`}
                    className="group flex items-start gap-3 rounded-xl border border-border/80 bg-background/40 p-4 transition-colors hover:border-primary/40"
                  >
                    <span className="flex-shrink-0 inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary text-[11px] font-mono font-semibold">
                      {source.n}
                    </span>
                    <div className="flex-1 min-w-0">
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-start gap-1.5 text-[14px] font-medium leading-snug text-foreground hover:text-primary transition-colors"
                      >
                        <span className="line-clamp-2">{source.title}</span>
                        <ExternalLink className="h-3 w-3 mt-0.5 flex-shrink-0 opacity-60 group-hover:opacity-100" />
                      </a>
                      {source.snippet && (
                        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground line-clamp-3">
                          {source.snippet}
                        </p>
                      )}
                      <div className="mt-2 text-[11px] font-mono text-muted-foreground/70 truncate">
                        {hostFromUrl(source.url)}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function AnchorLink({ slug }: { slug: string }) {
  return (
    <a
      href={`#${slug}`}
      aria-label="Anchor"
      className="ml-2 inline-flex text-muted-foreground/40 opacity-0 transition-opacity group-hover:opacity-100 hover:text-primary"
      onClick={(e) => {
        e.preventDefault();
        const el = document.getElementById(slug);
        if (el) {
          const y = el.getBoundingClientRect().top + window.scrollY - 96;
          window.scrollTo({ top: y, behavior: "smooth" });
          history.replaceState(null, "", `#${slug}`);
        }
      }}
    >
      <LinkIcon className="h-4 w-4" />
    </a>
  );
}

function CitationChip({ n, source }: { n: number; source: AnalysisSource }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-block align-super">
      <a
        href={source.url}
        target="_blank"
        rel="noopener noreferrer"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="inline-flex items-center rounded px-1 mx-0.5 text-[10px] font-semibold font-mono bg-primary/10 text-primary no-underline transition-colors hover:bg-primary/20"
      >
        [{n}]
      </a>
      {open && (
        <motion.span
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute left-1/2 bottom-full z-30 w-72 -translate-x-1/2 mb-2 rounded-lg border border-border bg-card p-3 shadow-xl shadow-black/40"
        >
          <span className="block text-[12px] font-semibold leading-snug text-foreground">
            {source.title}
          </span>
          {source.snippet && (
            <span className="mt-1.5 block text-[11px] leading-relaxed text-muted-foreground line-clamp-3">
              {source.snippet}
            </span>
          )}
          <span className="mt-2 block text-[10px] font-mono text-muted-foreground/70 truncate">
            {hostFromUrl(source.url)}
          </span>
        </motion.span>
      )}
    </span>
  );
}

interface ReportHeaderProps {
  analysis: AnalysisResponse;
  isFavorite: boolean;
  onFavorite: () => void;
  onCopy: () => void;
  onShare: () => void;
  onToggleDownload: () => void;
  downloadOpen: boolean;
  onClickOutsideDownload: () => void;
  downloading: ExportFormat | null;
  copied: boolean;
  onDownloadMarkdown: () => void;
  onDownloadServer: (fmt: ExportFormat) => void;
  sections: { hasOpportunities: boolean; hasRisks: boolean; hasRecommendations: boolean };
}

function ReportHeader({
  analysis,
  isFavorite,
  onFavorite,
  onCopy,
  onShare,
  onToggleDownload,
  downloadOpen,
  onClickOutsideDownload,
  downloading,
  copied,
  onDownloadMarkdown,
  onDownloadServer,
  sections,
}: ReportHeaderProps) {
  return (
    <header className="relative overflow-hidden border-b border-border">
      {/* Very soft emerald wash at the top edge — gives the card a "live" feel
          without using animation. */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-28 opacity-60 pointer-events-none"
        style={{
          background:
            "radial-gradient(80% 100% at 50% 0%, hsl(var(--primary) / 0.12) 0%, transparent 70%)",
        }}
      />
      <div className="relative px-6 md:px-10 py-7">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-start gap-4 min-w-0">
            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h2 className="text-2xl md:text-[28px] font-semibold tracking-tight capitalize truncate">
                {analysis.sector} Analysis
              </h2>
              <div className="mt-1 flex items-center gap-4 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-3 w-3" />
                  {formatDate(analysis.timestamp)}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Globe className="h-3 w-3" />
                  {analysis.sources_analyzed} sources
                </span>
                {analysis.cached && (
                  <span className="inline-flex items-center gap-1.5 text-primary">
                    <Sparkles className="h-3 w-3" />
                    Cached
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <IconButton onClick={onFavorite} active={isFavorite} title={isFavorite ? "Starred" : "Star sector"}>
              <Star className={cn("h-4 w-4", isFavorite && "fill-yellow-500 text-yellow-500")} />
            </IconButton>
            <IconButton onClick={onCopy} title={copied ? "Copied!" : "Copy as markdown"}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </IconButton>
            <IconButton onClick={onShare} title="Share">
              <Share2 className="h-4 w-4" />
            </IconButton>
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={onToggleDownload}
                isLoading={downloading !== null}
                className="h-9"
              >
                <Download className="h-4 w-4" />
                Export
              </Button>
              {downloadOpen && (
                <>
                  <button
                    type="button"
                    className="fixed inset-0 z-10 cursor-default"
                    aria-label="Close menu"
                    onClick={onClickOutsideDownload}
                  />
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute right-0 mt-2 w-64 rounded-xl border border-border bg-card shadow-2xl shadow-black/40 z-20 overflow-hidden"
                  >
                    <ExportMenuItem
                      label="Markdown"
                      hint=".md — original source"
                      onClick={onDownloadMarkdown}
                    />
                    <ExportMenuItem
                      label="PDF"
                      hint=".pdf — polished, printable"
                      onClick={() => onDownloadServer("pdf")}
                      loading={downloading === "pdf"}
                    />
                    <ExportMenuItem
                      label="Excel"
                      hint=".xlsx — summary + sources"
                      onClick={() => onDownloadServer("xlsx")}
                      loading={downloading === "xlsx"}
                    />
                    <ExportMenuItem
                      label="PowerPoint"
                      hint=".pptx — one slide per section"
                      badge="Pro"
                      onClick={() => onDownloadServer("pptx")}
                      loading={downloading === "pptx"}
                    />
                  </motion.div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Status chips */}
        {(sections.hasOpportunities || sections.hasRisks || sections.hasRecommendations) && (
          <div className="mt-5 flex flex-wrap gap-2">
            {sections.hasOpportunities && (
              <Badge variant="success" animated>
                <TrendingUp className="h-3 w-3 mr-1" />
                Opportunities
              </Badge>
            )}
            {sections.hasRisks && (
              <Badge variant="warning" animated>
                <AlertTriangle className="h-3 w-3 mr-1" />
                Risk Analysis
              </Badge>
            )}
            {sections.hasRecommendations && (
              <Badge variant="info" animated>
                <Lightbulb className="h-3 w-3 mr-1" />
                Recommendations
              </Badge>
            )}
          </div>
        )}
      </div>
    </header>
  );
}

function IconButton({
  children,
  onClick,
  active,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        "inline-flex items-center justify-center h-9 w-9 rounded-lg border border-border bg-card transition-colors hover:border-primary/40 hover:text-foreground",
        active ? "text-yellow-500 border-yellow-500/40" : "text-muted-foreground",
      )}
    >
      {children}
    </button>
  );
}

function ExportMenuItem({
  label,
  hint,
  onClick,
  loading,
  badge,
}: {
  label: string;
  hint: string;
  onClick: () => void;
  loading?: boolean;
  badge?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors border-b border-border/40 last:border-b-0 disabled:opacity-50"
    >
      <div className="min-w-0">
        <div className="text-sm font-medium text-foreground flex items-center gap-2">
          {label}
          {badge && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/15 text-primary font-semibold uppercase tracking-wide">
              {badge}
            </span>
          )}
        </div>
        <div className="text-[11px] text-muted-foreground mt-0.5">{hint}</div>
      </div>
      {loading && <div className="h-3.5 w-3.5 rounded-full border-2 border-primary border-t-transparent animate-spin flex-shrink-0" />}
    </button>
  );
}

function hostFromUrl(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return url;
  }
}
