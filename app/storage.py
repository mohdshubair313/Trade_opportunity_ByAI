"""
Report file storage — Supabase Storage with local-disk fallback.

Why a layer instead of writing directly:
- On Render (and any platform with ephemeral filesystems) locally-written
  report files vanish on every redeploy. The report *text* survives because
  it's persisted in the ``analyses.report`` column, but the downloadable
  markdown files referenced by ``saved_path`` would 404.
- Having an abstraction also gives us a single swap-point to add pre-rendered
  PDF/PPTX uploads later, or to move to a different provider.

When ``SUPABASE_URL`` + ``SUPABASE_SERVICE_KEY`` are set, reports upload to
the configured bucket (default: ``reports``). Otherwise we fall back to the
local ``reports/`` directory so dev machines and docker-compose Just Work.
"""
from __future__ import annotations

import logging
import os
import re
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)


@dataclass
class StoredReport:
    """Result of a save_markdown call — same shape for both backends."""
    url: Optional[str]      # Download URL. None for local backend.
    path: str               # Storage key (Supabase) or filesystem path (local).
    backend: str            # "supabase" | "local"


class ReportStorage:
    """Storage facade. Initialise once at import time; callers use the
    ``storage`` singleton below."""

    def __init__(self) -> None:
        self._client = None
        self._bucket_name = os.getenv("SUPABASE_REPORTS_BUCKET", "reports")
        self._local_dir = Path(os.getenv("REPORTS_DIR", "./reports"))
        self._local_dir.mkdir(parents=True, exist_ok=True)

    # ---- Lazy provider client -------------------------------------------

    def _supabase(self):
        """Return an initialised Supabase client, or None if credentials are
        missing / the SDK is not installed. Safe to call many times."""
        if self._client is not None:
            return self._client

        url = os.getenv("SUPABASE_URL", "").strip()
        # Uploads require the service-role key (the ``anon`` publishable key
        # is subject to Row-Level Security and typically can't write).
        key = os.getenv("SUPABASE_SERVICE_KEY", "").strip()
        if not url or not key:
            return None

        try:
            from supabase import create_client  # type: ignore
        except ImportError:
            logger.warning(
                "supabase SDK missing — `pip install supabase` to enable cloud storage"
            )
            return None

        try:
            self._client = create_client(url, key)
        except Exception as exc:  # noqa: BLE001 - any init error falls back to local
            logger.warning("Supabase client init failed (%s); using local storage", exc)
            self._client = None

        return self._client

    # ---- Public API ------------------------------------------------------

    def save_markdown(
        self,
        sector: str,
        content: str,
        *,
        user_id: Optional[int] = None,
    ) -> StoredReport:
        """Persist a markdown report and return a locator.

        Cloud path layout:  ``user_{id}/{sector}_{YYYYMMDD_HHMMSS}.md``  (or
        ``anon/...`` for guest reports). This keeps files per-user which is
        required anyway for any future RLS / access-control policies.
        """
        safe_sector = _sanitize_slug(sector)
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        user_prefix = f"user_{user_id}" if user_id else "anon"
        storage_path = f"{user_prefix}/{safe_sector}_{timestamp}.md"

        # --- Try cloud first --------------------------------------------
        client = self._supabase()
        if client is not None:
            try:
                data = content.encode("utf-8")
                client.storage.from_(self._bucket_name).upload(
                    path=storage_path,
                    file=data,
                    file_options={
                        "content-type": "text/markdown; charset=utf-8",
                        "upsert": "true",
                    },
                )
                url = client.storage.from_(self._bucket_name).get_public_url(storage_path)
                # Supabase returns trailing ?download= sometimes; keep the
                # plain URL so browsers render inline when desired.
                url = url.split("?")[0] if url else url
                logger.info("Uploaded report to Supabase: %s", storage_path)
                return StoredReport(url=url, path=storage_path, backend="supabase")
            except Exception as exc:  # noqa: BLE001 - network / auth / quota
                logger.warning(
                    "Supabase upload failed (%s); falling back to local disk", exc
                )

        # --- Local fallback ---------------------------------------------
        filename = f"{safe_sector}_{timestamp}.md"
        filepath = self._local_dir / filename
        filepath.write_text(content, encoding="utf-8")
        logger.info("Saved report locally: %s", filepath)
        return StoredReport(url=None, path=str(filepath), backend="local")

    def signed_url(self, storage_path: str, expires_in: int = 60 * 60) -> Optional[str]:
        """Return a short-lived signed URL for a private bucket object.

        Only meaningful when the Supabase bucket is configured as
        *private*; public buckets use ``get_public_url`` inline above.
        """
        client = self._supabase()
        if client is None:
            return None
        try:
            resp = client.storage.from_(self._bucket_name).create_signed_url(
                storage_path, expires_in
            )
            return resp.get("signedURL") or resp.get("signed_url")
        except Exception as exc:  # noqa: BLE001
            logger.warning("Signed URL generation failed for %s: %s", storage_path, exc)
            return None


def _sanitize_slug(name: str) -> str:
    """Filesystem-safe, URL-safe sector slug — lowercase, underscore-joined."""
    return re.sub(r"[^a-zA-Z0-9_-]+", "_", (name or "").strip()).strip("_").lower() or "report"


# Process-wide singleton. Cheap — just holds a lazy client.
storage = ReportStorage()
