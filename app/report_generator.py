"""
Report generator — adds YAML frontmatter and persists the markdown.

Persistence is delegated to ``app.storage`` which uploads to Supabase
Storage when credentials are configured, and falls back to the local
``reports/`` directory otherwise (useful for dev). The public download
URL (if any) is returned so callers can surface a "Download saved copy"
link in the UI without regenerating the file.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import datetime
from typing import Optional

from app.storage import StoredReport, storage

logger = logging.getLogger(__name__)


@dataclass
class SavedReport:
    """What the analyze route needs to persist on the Analysis row."""
    path: str                   # storage key (cloud) OR filesystem path (local)
    url: Optional[str]          # public download URL if available
    backend: str                # "supabase" | "local"


class ReportGenerator:
    """Generates and persists markdown reports."""

    def save_report(
        self,
        sector: str,
        content: str,
        *,
        user_id: Optional[int] = None,
    ) -> SavedReport:
        """Persist a markdown report and return a locator.

        The returned ``path`` is what we store on the ``Analysis.saved_path``
        column. ``url`` is a shareable download link when the cloud backend
        accepted the upload.
        """
        try:
            result: StoredReport = storage.save_markdown(
                sector, content, user_id=user_id
            )
            return SavedReport(path=result.path, url=result.url, backend=result.backend)
        except Exception as exc:  # noqa: BLE001 - never crash the analyze flow
            logger.error("Failed to persist report for %s: %s", sector, exc)
            raise

    def add_metadata(self, content: str, sector: str, sources_count: int) -> str:
        """Prepend a YAML frontmatter header — useful when the file is opened
        directly in a markdown reader (Obsidian, Notion import, etc.)."""
        metadata = (
            "---\n"
            f"title: Trade Opportunities Analysis - {sector.title()}\n"
            f"date: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')}\n"
            f"sector: {sector}\n"
            f"sources_analyzed: {sources_count}\n"
            "generated_by: TradeInsight AI\n"
            "---\n\n"
        )
        return metadata + content
