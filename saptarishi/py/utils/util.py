# Copyright © 2018-2026 ranjanravi.com. All rights reserved.
"""Small shared helpers (output retention, etc.)."""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

from utils.constant import (
    AUSPICIOUS_OUTPUT_SUBDIR,
    KUNDALI_OUTPUT_SUBDIR,
    OUTPUT_DIR_REL_PATH,
    OUTPUT_MAX_FILES,
)


def _output_max_files() -> int:
    raw = os.environ.get("SAPTARISHI_OUTPUT_MAX_FILES")
    if raw is not None and str(raw).strip() != "":
        try:
            return max(0, int(raw))
        except ValueError:
            pass
    return OUTPUT_MAX_FILES


def _prune_output_dir(directory: Path, *, max_files: int, keep: Path | None = None) -> None:
    """Keep only the newest ``max_files`` ``*.json`` files in ``directory``."""
    if max_files <= 0 or not directory.is_dir():
        return

    keep_resolved = keep.resolve() if keep else None
    files = sorted(
        (p for p in directory.iterdir() if p.is_file() and p.suffix.lower() == ".json"),
        key=lambda p: p.stat().st_mtime,
        reverse=True,
    )
    for path in files[max_files:]:
        if keep_resolved and path.resolve() == keep_resolved:
            continue
        try:
            path.unlink()
        except OSError:
            pass


def write_json_report(path: Path, report: dict[str, Any], *, max_files: int | None = None) -> None:
    """Write JSON to ``path`` and drop older ``*.json`` files in the same folder."""
    limit = _output_max_files() if max_files is None else max_files
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    if limit > 0:
        _prune_output_dir(path.parent, max_files=limit, keep=path)


def prune_project_output(project_root: Path, *, max_files: int | None = None) -> None:
    """Trim ``output/kundali`` and ``output/auspicious`` to the newest files only."""
    limit = _output_max_files() if max_files is None else max_files
    if limit <= 0:
        return
    base = project_root / OUTPUT_DIR_REL_PATH
    for subdir in (KUNDALI_OUTPUT_SUBDIR, AUSPICIOUS_OUTPUT_SUBDIR):
        _prune_output_dir(base / subdir, max_files=limit)


def format_birth_view(date_str: str, time_str: str, place_str: str = "") -> str:
    """``YYYY-MM-DD HH:MM:SS | place`` label for ``birth_views`` in users.json."""
    date_part = str(date_str or "").strip()
    time_part = str(time_str or "").strip()
    place_part = str(place_str or "").strip()
    if not date_part:
        return ""
    if not time_part:
        dt_label = date_part
    else:
        parts = time_part.split(":")
        if len(parts) == 2:
            time_part = f"{parts[0].zfill(2)}:{parts[1].zfill(2)}:00"
        elif len(parts) >= 3:
            time_part = f"{parts[0].zfill(2)}:{parts[1].zfill(2)}:{parts[2].zfill(2)}"
        dt_label = f"{date_part} {time_part}"
    if place_part:
        return f"{dt_label} | {place_part}"
    return dt_label
