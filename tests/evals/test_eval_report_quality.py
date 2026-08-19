"""Unit tests for report quality evaluation."""
from tests.evals.eval_report_quality import eval_report_quality


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


def test_eval_empty_or_invalid_report():
    """Verify handling of empty or malformed reports."""
    res = eval_report_quality("", "Banking")
    assert res["is_mock"] is True
    assert res["composite_score"] == 0
    assert res["grade"] == "F"
