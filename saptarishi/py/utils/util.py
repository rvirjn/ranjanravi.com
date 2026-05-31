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


def yes_no_str(flag: bool) -> str:
    """``yes`` / ``no`` string for JSON (no boolean literals in output)."""
    from utils.constant import HOUSE_6_8_12_NO, HOUSE_6_8_12_YES

    return HOUSE_6_8_12_YES if flag else HOUSE_6_8_12_NO


def parse_required_yes_no(value: Any, *, field: str, context: str) -> bool:
    """Read required ``yes`` / ``no`` flag from ``data.json`` (boolean not allowed)."""
    if value is None or (isinstance(value, str) and not str(value).strip()):
        raise ValueError(f"{context} missing {field}")
    if isinstance(value, bool):
        raise ValueError(f"{context} {field} must be yes/no string, not boolean")
    text = str(value).strip().lower()
    if text == "yes":
        return True
    if text == "no":
        return False
    raise ValueError(f"{context} {field} must be yes or no, got {value!r}")


def is_yes_no(value: Any) -> bool:
    """True when value is ``yes`` (string). Legacy boolean accepted when reading charts."""
    if isinstance(value, bool):
        return value
    return str(value or "").strip().lower() == "yes"


def json_stringify_yes_no_values(obj: Any) -> Any:
    """Recursively replace booleans with ``yes``/``no`` for JSON file output."""
    if isinstance(obj, bool):
        return yes_no_str(obj)
    if isinstance(obj, dict):
        return {key: json_stringify_yes_no_values(val) for key, val in obj.items()}
    if isinstance(obj, list):
        return [json_stringify_yes_no_values(item) for item in obj]
    return obj


def write_json_report(path: Path, report: dict[str, Any], *, max_files: int | None = None) -> None:
    """Write JSON to ``path`` and drop older ``*.json`` files in the same folder."""
    limit = _output_max_files() if max_files is None else max_files
    path.parent.mkdir(parents=True, exist_ok=True)
    safe_report = json_stringify_yes_no_values(report)
    path.write_text(json.dumps(safe_report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
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
