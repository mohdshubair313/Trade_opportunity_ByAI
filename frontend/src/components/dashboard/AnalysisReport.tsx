"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
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

export function AnalysisReport({ analysis }: AnalysisReportProps) {
  const [copied, setCopied] = useState(false);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [downloading, setDownloading] = useState<ExportFormat | null>(null);
  const { isFavorite: checkFavorite, toggleFavorite } = useFavorites();
  const isFavorite = checkFavorite(analysis.sector);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(analysis.report);
    setCopied(true);
    toast.success("Report copied to clipboard!");
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
    toast.success("Markdown downloaded.");
    setDownloadOpen(false);
  };

  const handleDownloadServer = async (fmt: ExportFormat) => {
    if (!analysis.id) {
      toast.error("Save this analysis first — only stored analyses can be exported.");
      return;
    }
    setDownloading(fmt);
    try {
      const blob = await exportAnalysis(analysis.id, fmt);
      downloadBlob(blob, `${safeSector}-analysis-${today}.${fmt}`);
      toast.success(`${fmt.toUpperCase()} downloaded.`);
      setDownloadOpen(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : `Could not export ${fmt}.`;
      toast.error(msg);
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
      } catch {
        handleCopy();
      }
    } else {
      handleCopy();
    }
  };

  const handleToggleFavorite = () => {
    toggleFavorite(analysis.sector);
  };

  // Extract key metrics from report (simplified parsing)
  const getReportSections = () => {
    const sections = {
      hasOpportunities: analysis.report.toLowerCase().includes("opportunit"),
      hasRisks: analysis.report.toLowerCase().includes("risk") || analysis.report.toLowerCase().includes("challenge"),
      hasRecommendations: analysis.report.toLowerCase().includes("recommend"),
    };
    return sections;
  };

  const sections = getReportSections();

  // Rewrite inline [N] tokens into markdown links pointing at the cited source.
  // Links get a recognisable anchor href (#src-N) so react-markdown preserves
  // them; the <a> renderer below converts them into nice citation chips.
  const sourcesById = useMemo(() => {
    const map = new Map<number, AnalysisSource>();
    analysis.sources?.forEach((s) => map.set(s.n, s));
    return map;
  }, [analysis.sources]);

  const reportWithCitations = useMemo(() => {
    if (!analysis.sources || analysis.sources.length === 0) return analysis.report;
    return analysis.report.replace(/\[(\d+)\]/g, (whole, numStr: string) => {
      const n = Number(numStr);
      return sourcesById.has(n) ? `[\\[${n}\\]](#src-${n})` : whole;
    });
  }, [analysis.report, analysis.sources, sourcesById]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-2xl border border-border overflow-hidden"
    >
      {/* Header */}
      <div className="p-6 border-b border-border bg-muted/30">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-bold capitalize">
                  {analysis.sector} Analysis
                </h2>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {formatDate(analysis.timestamp)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Globe className="h-3.5 w-3.5" />
                    {analysis.sources_analyzed} sources
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleToggleFavorite}
              className={cn(isFavorite && "text-yellow-500 border-yellow-500/50")}
            >
              <Star
                className={cn("h-4 w-4", isFavorite && "fill-yellow-500")}
              />
            </Button>
            <Button variant="outline" size="sm" onClick={handleCopy}>
              {copied ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
            <Button variant="outline" size="sm" onClick={handleShare}>
              <Share2 className="h-4 w-4" />
            </Button>

            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDownloadOpen((v) => !v)}
                isLoading={downloading !== null}
              >
                <Download className="h-4 w-4" />
                Export
              </Button>
              {downloadOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setDownloadOpen(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute right-0 mt-2 w-56 rounded-xl border border-border bg-card shadow-lg z-20 overflow-hidden"
                  >
                    <ExportOption
                      label="Markdown (.md)"
                      description="Original report text"
                      onClick={handleDownloadMarkdown}
                      loading={false}
                    />
                    <ExportOption
                      label="PDF"
                      description="Polished, printable"
                      onClick={() => handleDownloadServer("pdf")}
                      loading={downloading === "pdf"}
                    />
                    <ExportOption
                      label="Excel (.xlsx)"
                      description="Sheets for summary + sources"
                      onClick={() => handleDownloadServer("xlsx")}
                      loading={downloading === "xlsx"}
                    />
                    <ExportOption
                      label="PowerPoint (.pptx)"
                      description="One slide per section · Pro"
                      onClick={() => handleDownloadServer("pptx")}
                      loading={downloading === "pptx"}
                      badge="Pro"
                    />
                  </motion.div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="flex flex-wrap gap-2 mt-4">
          {sections.hasOpportunities && (
            <Badge variant="success" animated>
              <TrendingUp className="h-3 w-3 mr-1" />
              Opportunities Found
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
      </div>

      {/* Report Content */}
      <div className="p-6 md:p-8">
        <div className="prose-custom max-w-none">
          <ReactMarkdown
            components={{
              h1: ({ children }) => (
                <h1 className="text-3xl font-bold mb-4 gradient-text">
                  {children}
                </h1>
              ),
              h2: ({ children }) => (
                <h2 className="text-2xl font-semibold mb-3 mt-8 text-primary flex items-center gap-2">
                  <span className="w-1 h-6 bg-primary rounded-full" />
                  {children}
                </h2>
              ),
              h3: ({ children }) => (
                <h3 className="text-xl font-semibold mb-2 mt-6 text-foreground">
                  {children}
                </h3>
              ),
              p: ({ children }) => (
                <p className="mb-4 leading-relaxed text-muted-foreground">
                  {children}
                </p>
              ),
              ul: ({ children }) => (
                <ul className="list-none mb-4 space-y-2">{children}</ul>
              ),
              li: ({ children }) => (
                <li className="flex items-start gap-2 text-muted-foreground">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                  <span>{children}</span>
                </li>
              ),
              strong: ({ children }) => (
                <strong className="text-foreground font-semibold">
                  {children}
                </strong>
              ),
              blockquote: ({ children }) => (
                <blockquote className="border-l-4 border-primary pl-4 italic text-muted-foreground my-4 bg-muted/30 py-2 rounded-r-lg">
                  {children}
                </blockquote>
              ),
              a: ({ href, children }) => {
                // Citation chips use #src-N hrefs; all other links render as normal.
                const citationMatch = href?.match(/^#src-(\d+)$/);
                if (citationMatch) {
                  const n = Number(citationMatch[1]);
                  const source = sourcesById.get(n);
                  if (!source) return <>{children}</>;
                  return (
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={source.title}
                      className="inline-flex items-center px-1 mx-0.5 rounded text-[11px] font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors no-underline align-super"
                    >
                      [{n}]
                    </a>
                  );
                }
                return (
                  <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    {children}
                  </a>
                );
              },
            }}
          >
            {reportWithCitations}
          </ReactMarkdown>

          {analysis.sources && analysis.sources.length > 0 && (
            <div className="mt-10 pt-6 border-t border-border">
              <h3 className="text-lg font-semibold mb-4 text-foreground flex items-center gap-2">
                <Globe className="h-4 w-4 text-primary" />
                Sources ({analysis.sources.length})
              </h3>
              <ol className="space-y-2 list-none">
                {analysis.sources.map((source) => (
                  <li key={source.n} id={`src-${source.n}`} className="flex items-start gap-3 text-sm">
                    <span className="flex-shrink-0 inline-flex items-center justify-center w-6 h-6 rounded bg-primary/10 text-primary text-xs font-semibold">
                      {source.n}
                    </span>
                    <div className="flex-1 min-w-0">
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-foreground hover:text-primary transition-colors inline-flex items-start gap-1 group"
                      >
                        <span className="line-clamp-2">{source.title}</span>
                        <ExternalLink className="h-3 w-3 mt-0.5 flex-shrink-0 opacity-60 group-hover:opacity-100" />
                      </a>
                      {source.snippet && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                          {source.snippet}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      {analysis.saved_to && (
        <div className="px-6 py-4 border-t border-border bg-muted/30 text-sm text-muted-foreground">
          <span className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Saved to: {analysis.saved_to}
          </span>
        </div>
      )}
    </motion.div>
  );
}

function ExportOption({
  label,
  description,
  onClick,
  loading,
  badge,
}: {
  label: string;
  description: string;
  onClick: () => void;
  loading: boolean;
  badge?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="w-full flex items-start justify-between gap-3 p-3 text-left hover:bg-muted/50 transition-colors border-b border-border/40 last:border-b-0 disabled:opacity-50"
    >
      <div className="min-w-0">
        <p className="text-sm font-medium flex items-center gap-2">
          {label}
          {badge && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/15 text-primary font-semibold uppercase tracking-wide">
              {badge}
            </span>
          )}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      {loading && <div className="h-3 w-3 mt-1 rounded-full border-2 border-primary border-t-transparent animate-spin flex-shrink-0" />}
    </button>
  );
}
