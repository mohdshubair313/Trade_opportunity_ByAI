"""
Level 1 Deterministic Evaluations for Market Analysis Reports.

Evaluates report quality against structural, numerical, and citation criteria
without requiring external LLM API calls.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
import urllib.request
import urllib.parse
import urllib.error


REQUIRED_SECTIONS = [
    "Executive Summary",
    "Market Overview",
    "Trade Opportunities",
    "Recommendations",
]

EVAL_SECTORS = [
    "Technology",
    "Pharmaceuticals",
    "Automotive",
    "Renewable Energy",
    "Banking",
]


def eval_report_quality(report: str, sector: str) -> Dict[str, Any]:
    """
    Run deterministic evaluation checks on a generated market analysis report.

    Parameters
    ----------
    report : str
        The raw markdown text of the report.
    sector : str
        The target sector name (e.g. "Automotive").

    Returns
    -------
    Dict[str, Any]
        Dictionary with all evaluated metrics, boolean flags, and a composite score (0-100).
    """
    results: Dict[str, Any] = {}

    if not report or not isinstance(report, str):
        return {
            "is_mock": True,
            "mentions_sector": False,
            "has_all_sections": False,
            "missing_sections": REQUIRED_SECTIONS,
            "citation_count": 0,
            "has_citations": False,
            "word_count": 0,
            "adequate_length": False,
            "data_points": 0,
            "has_data": False,
            "composite_score": 0,
            "grade": "F",
        }

    # 1. Is it a mock report?
    results["is_mock"] = bool(
        "(Demo Mode)" in report
        or "(Mock Data)" in report
        or "Trade Opportunities Analysis (Demo Mode)" in report
    )

    # 2. Does it mention the sector by name?
    results["mentions_sector"] = sector.lower() in report.lower()

    # 3. Does it have all required sections?
    found_sections = []
    missing_sections = []
    for s in REQUIRED_SECTIONS:
        if s.lower() in report.lower():
            found_sections.append(s)
        else:
            missing_sections.append(s)

    results["has_all_sections"] = len(missing_sections) == 0
    results["missing_sections"] = missing_sections
    results["found_sections"] = found_sections

    # 4. Citations check (e.g. [1], [2], [1][2])
    citations = re.findall(r"\[\d+\]", report)
    results["citation_count"] = len(citations)
    results["has_citations"] = len(citations) > 0

    # 5. Report length
    words = report.split()
    results["word_count"] = len(words)
    results["adequate_length"] = len(words) >= 300

    # 6. Numbers/data points check ($150B, 12%, 40 billion, 50,000 crore, etc.)
    numbers = re.findall(
        r"\$[\d,.]+|\d+(?:\.\d+)?%|\b\d+(?:\.\d+)?\s*(?:billion|million|crore|lakh|trillion|usd|inr)\b",
        report,
        re.I,
    )
    results["data_points"] = len(numbers)
    results["has_data"] = len(numbers) >= 3

    # 7. Composite quality score (0 - 100)
    score = 0
    if not results["is_mock"]:
        score += 20  # Live generation bonus
    if results["mentions_sector"]:
        score += 15
    if results["has_all_sections"]:
        score += 25
    else:
        score += max(0, 25 - (len(missing_sections) * 6))
    if results["has_citations"]:
        score += min(20, results["citation_count"] * 4)
    if results["adequate_length"]:
        score += 10
    if results["has_data"]:
        score += min(10, results["data_points"] * 2)

    results["composite_score"] = min(100, score)

    # Letter grade
    if results["composite_score"] >= 85:
        results["grade"] = "A"
    elif results["composite_score"] >= 70:
        results["grade"] = "B"
    elif results["composite_score"] >= 50:
        results["grade"] = "C"
    else:
        results["grade"] = "F"

    return results


def run_eval_on_api(
    base_url: str = "http://localhost:8000",
    sectors: Optional[List[str]] = None,
    use_cache: bool = False,
    timeout: int = 60,
) -> List[Dict[str, Any]]:
    """
    Call the running API for each sector and evaluate returned reports.
    """
    target_sectors = sectors or EVAL_SECTORS
    suite_results = []

    print(f"\n=======================================================")
    print(f"  AI Report Quality Evals — Running against {base_url}")
    print(f"  Sectors ({len(target_sectors)}): {', '.join(target_sectors)}")
    print(f"  use_cache: {use_cache}")
    print(f"=======================================================\n")

    for sector in target_sectors:
        url = f"{base_url.rstrip('/')}/api/v1/analyze/{urllib.parse.quote(sector)}?use_cache={str(use_cache).lower()}"
        start_time = datetime.now()
        print(f"Evaluating sector '{sector}'... ", end="", flush=True)

        try:
            req = urllib.request.Request(url, headers={"User-Agent": "EvalSuite/1.0"})
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                status_code = resp.status
                data = json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            elapsed = (datetime.now() - start_time).total_seconds()
            print(f"[HTTP {e.code}] ({elapsed:.1f}s)")
            suite_results.append({
                "sector": sector,
                "status": f"HTTP_{e.code}",
                "elapsed_sec": elapsed,
                "error": str(e),
                "eval": eval_report_quality("", sector),
            })
            continue
        except Exception as e:
            elapsed = (datetime.now() - start_time).total_seconds()
            print(f"[ERROR: {e}] ({elapsed:.1f}s)")
            suite_results.append({
                "sector": sector,
                "status": "ERROR",
                "elapsed_sec": elapsed,
                "error": str(e),
                "eval": eval_report_quality("", sector),
            })
            continue

        elapsed = (datetime.now() - start_time).total_seconds()
        report_text = data.get("report", "")
        eval_metrics = eval_report_quality(report_text, sector)

        layer_used = data.get("layer_used", "unknown")
        is_mock_api = data.get("is_mock", False)

        print(
            f"Score: {eval_metrics['composite_score']}/100 ({eval_metrics['grade']}) "
            f"| Layer: {layer_used} | Mock: {eval_metrics['is_mock']} ({elapsed:.1f}s)"
        )

        suite_results.append({
            "sector": sector,
            "status": "SUCCESS",
            "elapsed_sec": elapsed,
            "layer_used": layer_used,
            "is_mock_api": is_mock_api,
            "sources_count": data.get("sources_analyzed", 0),
            "eval": eval_metrics,
        })

    return suite_results


# ---------------------------------------------------------------------------
# Pytest Unit Tests for the Evaluator
# ---------------------------------------------------------------------------

def test_eval_mock_report():
    """Verify that a demo/mock report is correctly identified with is_mock=True."""
    mock_text = """# Technology Sector - Trade Opportunities Analysis (Demo Mode)
## Executive Summary
The Technology sector in India is currently witnessing robust growth.
## Market Overview
- Market Size: Estimated at $150 Billion (2024), growing at 12% CAGR.
## Trade Opportunities
### Export Opportunities
- High Potential: IT services expected to reach $40 Billion by 2026.
## Recommendations
- Focus on market research.
---
*Report generated on August 19, 2026 (Mock Data)*"""

    res = eval_report_quality(mock_text, "Technology")
    assert res["is_mock"] is True
    assert res["mentions_sector"] is True
    assert res["has_all_sections"] is True
    assert res["has_data"] is True


def test_eval_real_report():
    """Verify that a high-quality report with citations receives high scores."""
    real_text = """# Automotive Sector — Trade Opportunities Analysis
## Executive Summary
India's automotive industry is expanding rapidly backed by EV adoption [1]. Total turnover reached $100 billion [2].
## Market Overview
The automotive sector accounts for 7.1% of India's GDP [1]. EV growth is 45% YoY [3].
## Trade Opportunities
Export opportunities in 2-wheelers are poised to hit $15 billion by 2027 [2][4].
## Recommendations
Expand local component manufacturing and battery cell supply chain [5]."""

    res = eval_report_quality(real_text, "Automotive")
    assert res["is_mock"] is False
    assert res["mentions_sector"] is True
    assert res["has_all_sections"] is True
    assert res["has_citations"] is True
    assert res["citation_count"] >= 5
    assert res["has_data"] is True
    assert res["composite_score"] >= 80


# ---------------------------------------------------------------------------
# CLI Runner
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Evaluate Market Analysis Reports")
    parser.add_argument("--base-url", default="http://localhost:8000", help="Base URL of backend API")
    parser.add_argument("--sectors", nargs="+", help="Specific sectors to test (e.g. Technology Automotive)")
    parser.add_argument("--use-cache", action="store_true", help="Allow cached responses from API")
    parser.add_argument("--dry-run", action="store_true", help="Run local evaluator unit test suite without hitting API")
    parser.add_argument("--json", action="store_true", help="Output results in JSON format")

    args = parser.parse_args()

    if args.dry_run:
        print("[Dry Run] Running evaluator internal verification tests...")
        test_eval_mock_report()
        test_eval_real_report()
        print("[SUCCESS] All evaluator unit tests passed successfully.")
        sys.exit(0)

    results = run_eval_on_api(
        base_url=args.base_url,
        sectors=args.sectors,
        use_cache=args.use_cache,
    )

    if args.json:
        print(json.dumps(results, indent=2))
    else:
        print("\n======================= SUMMARY =======================")
        for r in results:
            if r["status"] == "SUCCESS":
                e = r["eval"]
                print(
                    f"- {r['sector']:<18} | Score: {e['composite_score']:>3}/100 ({e['grade']}) | "
                    f"Layer: {r['layer_used']:<12} | Mock: {str(e['is_mock']):<5} | "
                    f"Words: {e['word_count']:>4} | Citations: {e['citation_count']:>2} | Time: {r['elapsed_sec']:.1f}s"
                )
            else:
                print(f"- {r['sector']:<18} | FAILED: {r['status']}")
        print("=======================================================\n")
