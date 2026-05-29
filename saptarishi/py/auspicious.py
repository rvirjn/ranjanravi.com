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
    """Keep the strongest slot on each calendar day, then return top ``top_n`` days."""
    best_by_date: dict[str, dict[str, Any]] = {}
    for row in scanned:
        day = str(row.get("date") or "")
        if not day:
            continue
        strength = row.get("houses_strength_total")
        prev = best_by_date.get(day)
        if prev is None or (
            isinstance(strength, (int, float))
            and strength > prev.get("houses_strength_total", -1)
        ):
            best_by_date[day] = row
    ranked = sorted(
        best_by_date.values(),
        key=lambda row: row.get("houses_strength_total", 0),
        reverse=True,
    )
    return ranked[: max(1, int(top_n))]


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
    def build_summary_table_rows(report: dict[str, Any]) -> list[dict[str, str]]:
        place = report.get("place_resolved") or {}
        return [
            {"label": "Place", "value": format_place_resolved(place) or report.get("place_query", "")},
            {"label": "From date", "value": report.get("date_from", "")},
            {"label": "To date", "value": report.get("date_to", "")},
            {"label": "Slot interval", "value": f"Every {report.get('slot_hour_step', AUSPICIOUS_SLOT_HOUR_STEP)} hours"},
            {"label": "Days in range", "value": str(report.get("days_in_range", ""))},
            {"label": "Slots scanned", "value": str(report.get("slots_scanned", ""))},
            {"label": "Selection", "value": "Best time on each day, then top days by strength"},
            {"label": "House system", "value": house_system_label(report.get("house_system", DEFAULT_HOUSE_SYSTEM))},
        ]

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
            strength = builder.houses_strength_for_datetime(
                date_s, time_s, place_query, geo, house_system
            )
            slot_count += 1
            scanned.append({
                "date": date_s,
                "time": time_s,
                "datetime_local_iso": slot_dt.isoformat(),
                "houses_strength_total": strength,
            })

        top = select_top_auspicious_slots(scanned, top_n)
        days_in_range = (d_to - d_from).days + 1

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
            "top": top,
        }
        report["summary_table"] = self.build_summary_table_rows(report)
        report["top_table"] = self.build_top_table_rows(top)
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
