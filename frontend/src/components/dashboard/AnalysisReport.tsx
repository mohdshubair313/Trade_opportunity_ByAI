"use client";

import { useState } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { cn, formatDate } from "@/lib/utils";
import { AnalysisResponse } from "@/lib/api";
import { useStore } from "@/store/useStore";
import { useFavorites } from "@/hooks/useFavorites";
import toast from "react-hot-toast";

interface AnalysisReportProps {
  analysis: AnalysisResponse;
}

export function AnalysisReport({ analysis }: AnalysisReportProps) {
  const [copied, setCopied] = useState(false);
  const { isFavorite: checkFavorite, toggleFavorite } = useFavorites();
  const isFavorite = checkFavorite(analysis.sector);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(analysis.report);
    setCopied(true);
    toast.success("Report copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([analysis.report], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${analysis.sector.toLowerCase().replace(/\s+/g, "-")}-analysis-${new Date().toISOString().split("T")[0]
      }.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Report downloaded!");
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
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="h-4 w-4" />
              Download
            </Button>
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
            }}
          >
            {analysis.report}
          </ReactMarkdown>
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
