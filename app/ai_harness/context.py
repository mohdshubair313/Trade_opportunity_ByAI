"""Context packing helpers used before model calls."""
from __future__ import annotations

import json
from typing import Any


def estimate_tokens(text: str) -> int:
    """Cheap approximation for telemetry and budget decisions."""
    return max(1, len(text) // 4)


def trim_text_middle(text: str, max_chars: int, marker: str = "\n...[trimmed for context budget]...\n") -> str:
    if max_chars <= 0 or len(text) <= max_chars:
        return text
    keep = max_chars - len(marker)
    if keep <= 0:
        return text[:max_chars]
    head = keep // 2
    tail = keep - head
    return f"{text[:head]}{marker}{text[-tail:]}"


def compact_json_payload(value: Any, *, max_chars: int) -> str:
    """Serialize JSON compactly and trim large string fields if needed."""
    text = json.dumps(value, ensure_ascii=False, separators=(",", ":"))
    if len(text) <= max_chars:
        return text
    return trim_text_middle(text, max_chars)


def pack_sections(sections: dict[str, str], *, max_chars: int) -> str:
    """Pack named text sections in priority order within a fixed char budget."""
    if not sections:
        return ""
    remaining = max_chars
    rendered: list[str] = []
    for name, body in sections.items():
        header = f"\n\n## {name}\n"
        allowance = max(0, remaining - len(header))
        if allowance <= 0:
            break
        chunk = trim_text_middle(body or "", allowance)
        rendered.append(f"{header}{chunk}")
        remaining -= len(header) + len(chunk)
    return "".join(rendered).strip()
