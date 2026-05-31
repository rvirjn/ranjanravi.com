# Copyright © 2018-2026 ranjanravi.com. All rights reserved.
"""
Find top date/time slots in a range by ``houses_strength_total`` (2-hour steps).

Writes ``output/auspicious/{date_from}_{date_to}_{place}.json`` with ``summary_table`` and
``top_table`` for the UI. CLI::

    python py/auspicious.py --from 2026-05-20 --to 2026-06-20 --place "Bengaluru, India"
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Any

try:
    from zoneinfo import ZoneInfo
except ImportError:
    from backports.zoneinfo import ZoneInfo  # type: ignore[no-redef]

_PY_DIR = Path(__file__).resolve().parent
if str(_PY_DIR) not in sys.path:
    sys.path.insert(0, str(_PY_DIR))

from utils.constant import (
    AUSPICIOUS_LORD_COMPARE_PLANETS,
    AUSPICIOUS_MAX_RANGE_DAYS,
    AUSPICIOUS_OUTPUT_SUBDIR,
    AUSPICIOUS_READY_STATUS_MESSAGE,
    AUSPICIOUS_SLOT_HOUR_STEP,
    AUSPICIOUS_TOP_COUNT,
    DEFAULT_HOUSE_SYSTEM,
    OUTPUT_DIR_REL_PATH,
    PLANET_STATUS_HIGH,
    VALID_HOUSE_SYSTEMS,
)
from kundali import KundaliBuilder


def parse_iso_date(value: str) -> date:
    text = str(value or "").strip()
    try:
        return datetime.strptime(text, "%Y-%m-%d").date()
    except ValueError as exc:
        raise ValueError(f"date must be YYYY-MM-DD, got {value!r}") from exc


def validate_date_range(date_from: date, date_to: date) -> None:
    if date_to < date_from:
        raise ValueError("date_to must be on or after date_from")
    span_days = (date_to - date_from).days + 1
    if span_days > AUSPICIOUS_MAX_RANGE_DAYS:
        raise ValueError(
            f"date range is {span_days} days; maximum is {AUSPICIOUS_MAX_RANGE_DAYS} days"
        )


def iter_slot_datetimes(
    date_from: date,
    date_to: date,
    timezone_name: str,
    hour_step: int = AUSPICIOUS_SLOT_HOUR_STEP,
):
    """Every ``hour_step`` hours, each civil day from ``date_from`` through ``date_to`` (local TZ)."""
    tz = ZoneInfo(timezone_name)
    day = date_from
    while day <= date_to:
        for hour in range(0, 24, hour_step):
            if hour > 22:
                break
            yield datetime(day.year, day.month, day.day, hour, 0, 0, tzinfo=tz)
        day += timedelta(days=1)


def select_top_auspicious_slots(
    scanned: list[dict[str, Any]],
    top_n: int = AUSPICIOUS_TOP_COUNT,
) -> list[dict[str, Any]]:
    """Top ``top_n`` slots by unique ``houses_strength_total`` (highest first)."""
    limit = max(1, int(top_n))

    def strength(row: dict[str, Any]) -> float:
        value = row.get("houses_strength_total")
        return float(value) if isinstance(value, (int, float)) else float("-inf")

    ranked = sorted(
        scanned,
        key=lambda row: (
            -strength(row),
            str(row.get("date") or ""),
            str(row.get("time") or ""),
        ),
    )
    result: list[dict[str, Any]] = []
    seen_totals: set[int] = set()
    for row in ranked:
        total = row.get("houses_strength_total")
        if not isinstance(total, (int, float)):
            continue
        total_key = int(round(total))
        if total_key in seen_totals:
            continue
        seen_totals.add(total_key)
        result.append(row)
        if len(result) >= limit:
            break
    return result


def format_place_resolved(geo: dict[str, Any]) -> str:
    parts = [geo.get("name"), geo.get("admin1"), geo.get("country")]
    text = ", ".join(str(p).strip() for p in parts if p)
    tz = geo.get("timezone")
    if tz:
        text = f"{text} ({tz})" if text else str(tz)
    return text or ""


def house_system_label(house_system: str) -> str:
    code = str(house_system or DEFAULT_HOUSE_SYSTEM).strip().upper()
    if code == "W":
        return "Whole sign (W)"
    return code


class AuspiciousBuilder:
    """Scan date range for top house-strength slots; write UI-ready JSON."""

    def __init__(self, project_root: Path) -> None:
        self.root = project_root
        self.output_dir = project_root / OUTPUT_DIR_REL_PATH

    @staticmethod
    def place_slug(place_query: str) -> str:
        slug = re.sub(r"[^a-z0-9]+", "_", place_query.strip().lower())
        slug = re.sub(r"_+", "_", slug).strip("_") or "place"
        if len(slug) > 96:
            slug = slug[:96].rstrip("_")
        return slug

    @classmethod
    def auspicious_output_filename(
        cls, date_from: str, date_to: str, place_query: str
    ) -> str:
        """Relative path under ``output/``: ``auspicious/{from}_{to}_{place}.json``."""
        slug = cls.place_slug(place_query)
        return f"{AUSPICIOUS_OUTPUT_SUBDIR}/{date_from.strip()}_{date_to.strip()}_{slug}.json"

    @staticmethod
    def write_report_to_file(report: dict[str, Any], path: Path) -> None:
        from utils.util import write_json_report

        write_json_report(path, report)

    @staticmethod
    def selection_summary_label(top_n: int = AUSPICIOUS_TOP_COUNT) -> str:
        return f"Top {top_n} unique highest house strength totals"

    @staticmethod
    def build_summary_table_rows(report: dict[str, Any]) -> list[dict[str, str]]:
        place = report.get("place_resolved") or {}
        days_in_range = int(report.get("days_in_range") or 1)
        top_n = int(report.get("top_count") or AUSPICIOUS_TOP_COUNT)
        return [
            {"label": "Place", "value": format_place_resolved(place) or report.get("place_query", "")},
            {"label": "From date", "value": report.get("date_from", "")},
            {"label": "To date", "value": report.get("date_to", "")},
            {"label": "Slot interval", "value": f"Every {report.get('slot_hour_step', AUSPICIOUS_SLOT_HOUR_STEP)} hours"},
            {"label": "Days in range", "value": str(days_in_range)},
            {"label": "Slots scanned", "value": str(report.get("slots_scanned", ""))},
            {
                "label": "Selection",
                "value": AuspiciousBuilder.selection_summary_label(top_n),
            },
            {"label": "House system", "value": house_system_label(report.get("house_system", DEFAULT_HOUSE_SYSTEM))},
        ]

    @staticmethod
    def format_slot_column_label(date_s: str, time_s: str) -> str:
        """Compact column label for lord comparison, e.g. ``2 Jun 12:00``."""
        try:
            dt = datetime.strptime(f"{date_s} {time_s}", "%Y-%m-%d %H:%M")
            return f"{dt.day} {dt.strftime('%b')} {dt.strftime('%H:%M')}"
        except ValueError:
            return f"{date_s} {time_s}"

    @staticmethod
    def build_lord_comparison_table(
        top_slots: list[dict[str, Any]],
    ) -> dict[str, Any]:
        """Lord% differences across top slots (rows only where sign or strength changes)."""
        columns: list[dict[str, Any]] = []
        for slot in top_slots:
            columns.append({
                "date": slot.get("date", ""),
                "time": slot.get("time", ""),
                "label": AuspiciousBuilder.format_slot_column_label(
                    str(slot.get("date") or ""),
                    str(slot.get("time") or ""),
                ),
                "houses_strength_total": slot.get("houses_strength_total"),
                "kundali_chart": slot.get("kundali_chart"),
            })

        lord_order = AUSPICIOUS_LORD_COMPARE_PLANETS
        rows: list[dict[str, Any]] = []
        for lord in lord_order:
            cells: list[dict[str, Any]] = []
            signatures: set[tuple[Any, ...]] = set()
            for slot in top_slots:
                lords = slot.get("lord_strength") or {}
                entry = lords.get(lord) if isinstance(lords, dict) else None
                if not isinstance(entry, dict):
                    cells.append({
                        "rashi_english": "",
                        "strength_percent": None,
                        "rashi_relation": "",
                        "adjustment": None,
                        "factors": [],
                        "display": "",
                        "breakdown": "",
                    })
                    signatures.add(())
                    continue
                rashi = str(entry.get("rashi_english") or "").strip().lower()
                strength = entry.get("strength_percent")
                relation = str(entry.get("rashi_relation") or "neutral")
                adjustment = entry.get("adjustment")
                factors = entry.get("factors") if isinstance(entry.get("factors"), list) else []
                display = str(entry.get("display") or "")
                cells.append({
                    "rashi_english": rashi,
                    "strength_percent": strength,
                    "rashi_relation": relation,
                    "adjustment": adjustment,
                    "lord_strength_base": entry.get("lord_strength_base", 100),
                    "factors": factors,
                    "display_main": str(entry.get("display_main") or ""),
                    "display_total": str(entry.get("display_total") or ""),
                    "display": display,
                    "breakdown": str(entry.get("breakdown") or ""),
                    "factor_sum": entry.get("factor_sum"),
                })
                signatures.add(str(entry.get("display_main") or display))

            if len(signatures) <= 1:
                continue

            rows.append({
                "planet": lord,
                "cells": cells,
            })

        return {"columns": columns, "rows": rows, "lord_strength_base": 100}

    @staticmethod
    def build_top_table_rows(top_slots: list[dict[str, Any]]) -> list[dict[str, Any]]:
        rows: list[dict[str, Any]] = []
        for index, slot in enumerate(top_slots, start=1):
            strength = slot.get("houses_strength_total")
            rows.append({
                "rank": index,
                "date": slot.get("date", ""),
                "time": slot.get("time", ""),
                "houses_strength_total": strength,
                "cell_styles": {
                    "houses_strength_total": (
                        PLANET_STATUS_HIGH
                        if isinstance(strength, (int, float)) and strength > 0
                        else ""
                    ),
                },
            })
        return rows

    def build_full_report(
        self,
        date_from: str,
        date_to: str,
        place_query: str,
        house_system: str = DEFAULT_HOUSE_SYSTEM,
        top_n: int = AUSPICIOUS_TOP_COUNT,
    ) -> dict[str, Any]:
        """Scan 2-hour slots; return UI-ready payload (no file dump)."""
        d_from = parse_iso_date(date_from)
        d_to = parse_iso_date(date_to)
        validate_date_range(d_from, d_to)

        builder = KundaliBuilder(self.root)
        geo = builder.geocode_place_name(place_query)
        tz_name = str(geo.get("timezone") or "UTC")

        scanned: list[dict[str, Any]] = []
        slot_count = 0
        for slot_dt in iter_slot_datetimes(d_from, d_to, tz_name):
            date_s = slot_dt.strftime("%Y-%m-%d")
            time_s = slot_dt.strftime("%H:%M")
            snapshot = builder.house_strength_snapshot_for_datetime(
                date_s, time_s, place_query, geo, house_system
            )
            slot_count += 1
            scanned.append({
                "date": date_s,
                "time": time_s,
                "datetime_local_iso": slot_dt.isoformat(),
                "houses_strength_total": snapshot.get("houses_strength_total"),
                "lord_strength": snapshot.get("lord_strength") or {},
            })

        days_in_range = (d_to - d_from).days + 1
        top = select_top_auspicious_slots(scanned, top_n)
        for slot in top:
            slot["kundali_chart"] = builder.kundali_chart_payload_for_datetime(
                str(slot.get("date") or ""),
                str(slot.get("time") or ""),
                place_query,
                geo,
                house_system,
            )

        report: dict[str, Any] = {
            "place_query": place_query,
            "place_resolved": {
                "name": geo.get("name"),
                "admin1": geo.get("admin1"),
                "country": geo.get("country"),
                "timezone": geo.get("timezone"),
            },
            "date_from": d_from.isoformat(),
            "date_to": d_to.isoformat(),
            "house_system": house_system,
            "slot_hour_step": AUSPICIOUS_SLOT_HOUR_STEP,
            "slots_scanned": slot_count,
            "days_in_range": days_in_range,
            "top_count": top_n,
            "top": top,
        }
        report["summary_table"] = self.build_summary_table_rows(report)
        report["top_table"] = self.build_top_table_rows(top)
        report["lord_comparison_table"] = self.build_lord_comparison_table(top)
        report["ui_status_message"] = AUSPICIOUS_READY_STATUS_MESSAGE
        return report

    def create_dumps_auspicious_report(
        self,
        date_from: str,
        date_to: str,
        place_query: str,
        house_system: str = DEFAULT_HOUSE_SYSTEM,
        top_n: int = AUSPICIOUS_TOP_COUNT,
    ) -> dict[str, Any]:
        """Build report, write ``output/auspicious/{from}_{to}_{place}.json``, return report."""
        report = self.build_full_report(
            date_from, date_to, place_query, house_system, top_n
        )
        rel_name = self.auspicious_output_filename(date_from, date_to, place_query)
        dump_path = self.output_dir / rel_name
        self.write_report_to_file(report, dump_path)
        try:
            rel = dump_path.relative_to(self.root)
        except ValueError:
            rel = dump_path
        report["output_json_file"] = str(rel).replace("\\", "/")
        return report


def build_full_auspicious(
    root: Path,
    date_from: str,
    date_to: str,
    place_query: str,
    house_system: str = DEFAULT_HOUSE_SYSTEM,
    top_n: int = AUSPICIOUS_TOP_COUNT,
) -> dict[str, Any]:
    """Build auspicious scan in memory (no ``output/`` write)."""
    return AuspiciousBuilder(root).build_full_report(
        date_from, date_to, place_query, house_system, top_n
    )


def find_top_auspicious_slots(
    root: Path,
    date_from: str,
    date_to: str,
    place_query: str,
    house_system: str = DEFAULT_HOUSE_SYSTEM,
    top_n: int = AUSPICIOUS_TOP_COUNT,
) -> dict[str, Any]:
    """Legacy alias for ``build_full_auspicious``."""
    return build_full_auspicious(
        root, date_from, date_to, place_query, house_system, top_n
    )


def main() -> None:
    root = Path(__file__).resolve().parent.parent
    ap = argparse.ArgumentParser(description="Top auspicious times by house strength")
    ap.add_argument("--from", dest="date_from", required=True, help="Start date YYYY-MM-DD")
    ap.add_argument("--to", dest="date_to", required=True, help="End date YYYY-MM-DD")
    ap.add_argument("--place", required=True)
    ap.add_argument("--house-system", default=DEFAULT_HOUSE_SYSTEM, choices=VALID_HOUSE_SYSTEMS)
    ap.add_argument("--top", type=int, default=AUSPICIOUS_TOP_COUNT)
    args = ap.parse_args()

    payload = AuspiciousBuilder(root).create_dumps_auspicious_report(
        args.date_from,
        args.date_to,
        args.place,
        args.house_system,
        args.top,
    )
    dump_path = root / str(payload.get("output_json_file", ""))
    print(f"[auspicious] wrote JSON: {dump_path}", file=sys.stderr)
    for row in payload.get("top_table") or []:
        print(
            f"{row.get('rank')}. {row.get('date')} {row.get('time')}  "
            f"houses_strength_total={row.get('houses_strength_total')}"
        )
    print(f"scanned {payload.get('slots_scanned')} slots")


if __name__ == "__main__":
    main()
