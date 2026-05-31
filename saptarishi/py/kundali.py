# Copyright © 2018-2026 ranjanravi.com. All rights reserved.
"""
Sidereal birth chart (kundali) from civil date, time, and place name.

CLI: ``python py/kundali.py --date YYYY-MM-DD --time HH:MM --place "City, Country"``

Flask/UI: ``build_full_kundali(root, date, time, place)`` → chart + ``nakshatras`` + UI tables.
"""

from __future__ import annotations

import argparse
import calendar
import copy
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime
from pathlib import Path
from typing import Any

try:
    from zoneinfo import ZoneInfo
except ImportError:  # Python < 3.9
    try:
        from backports.zoneinfo import ZoneInfo
    except ImportError as exc:
        raise SystemExit(
            "Install backports.zoneinfo and tzdata, or use Python 3.9+. "
            "Example: pip install backports.zoneinfo tzdata"
        ) from exc

import swisseph as swe

_PY_DIR = Path(__file__).resolve().parent
if str(_PY_DIR) not in sys.path:
    sys.path.insert(0, str(_PY_DIR))

from utils.util import is_yes_no, json_stringify_yes_no_values, parse_required_yes_no, yes_no_str
from utils.constant import (
    AYANAMSA_NAME,
    AUSPICIOUS_LORD_COMPARE_PLANETS,
    DEFAULT_GRAHA_BODIES,
    DEFAULT_HOUSE_SYSTEM,
    DEGREES_180,
    EPHEMERIS_DIR_REL_PATH,
    FULL_CIRCLE_DEGREES,
    HOUSE_6_8_12,
    HOUSE_6_8_12_NO,
    HOUSE_6_8_12_YES,
    HOUSE_TRIKONA,
    ONE_HOUSE_DEGREES,
    ONE_NAKSHATRA_DEGREES,
    PLANET_RELATION_ENEMY,
    PLANET_RELATION_FRIEND,
    PLANET_RELATION_NEUTRAL,
    PLANET_RELATION_OWN,
    PLANET_STATUS_HIGH,
    PLANET_STATUS_LOW,
    PLANET_DIGNITY_DEBILITATED,
    PLANET_DIGNITY_EXALTED,
    GEOCODE_ALTERNATIVE_COUNT,
    GEOCODE_API_SEARCH_URL,
    GEOCODE_RESULT_COUNT,
    GEOCODE_TIMEOUT_SECONDS,
    GEOCODE_USER_AGENT,
    KUNDALI_READY_STATUS_MESSAGE,
    KUNDALI_OUTPUT_SUBDIR,
    NAKSHATRA_COUNT,
    OUTPUT_DIR_REL_PATH,
    PADAS_PER_NAKSHATRA,
    PAKSHA_KRISHNA,
    PAKSHA_SHUKLA,
    DATA_JSON_REL_PATH,
    RASHI_COUNT,
    RASHI_IN_ENG,
    RASHI_IN_SANSKRIT,
    RASHI_SIGN_LORD_IN_ENG,
    SHUKLA_PAKSHA_MAX_TITHI,
    TITHI_AMAVASYA,
    TITHI_COUNT,
    TITHI_DEGREES_PER_TITHI,
    TITHI_NAME_1_TO_14,
    TITHI_PURNIMA,
    UNKNOWN_LABEL,
    VALID_HOUSE_SYSTEMS,
    VIMSHOTTARI_CYCLE_YEARS,
    VIMSHOTTARI_MAHADASHA_SEQUENCE,
)


def remove_white_space(value: Any) -> str:
    """Strip edges, collapse runs of spaces, lowercase (for nakshatra/planet name matching)."""
    return " ".join(str(value or "").strip().lower().split())


class NavataraFinder:
    """Rotate nakshatra list from janma and attach nava-tara navatara sequences."""

    def __init__(self, planet_database: dict[str, Any]) -> None:
        nakshatras = planet_database.get("nakshatras")
        if not isinstance(nakshatras, list) or not nakshatras:
            raise ValueError("nakshatras required in data.json")
        self.nakshatras_dict = nakshatras
        ntc = planet_database.get("nava_tara")
        if not isinstance(ntc, dict):
            raise ValueError("nava_tara required in data.json")
        navatara = ntc.get("navatara")
        if not isinstance(navatara, list) or not navatara:
            raise ValueError("nava_tara.navatara required in data.json")
        self.navatara_dict = navatara
        self.nakshatra_name_with_index = {
            remove_white_space(item["nakshatra"]): idx
            for idx, item in enumerate(self.nakshatras_dict)
        }

    def rotate_nakshatras_starting_from_janma(self, nakshatra_name: str) -> list[dict[str, Any]]:
        nakshatra_key = remove_white_space(nakshatra_name)
        if nakshatra_key not in self.nakshatra_name_with_index:
            raise ValueError(f"nakshatra not found in data.json: {nakshatra_name!r}")
        start_index = self.nakshatra_name_with_index[nakshatra_key]
        return self.nakshatras_dict[start_index:] + self.nakshatras_dict[:start_index]

    def build_navatara_with_nakshatra_rows(
        self, ordered_nakshatras: list[dict[str, Any]]
    ) -> list[dict[str, Any]]:
        navatara_with_nakshatras: list[dict[str, Any]] = []
        for navatara in self.navatara_dict:
            if not isinstance(navatara, dict):
                continue
            sequence_list = navatara.get("sequences")
            if not isinstance(sequence_list, list):
                raise ValueError(
                    f"nava_tara.navatara {navatara.get('name')!r} missing sequences"
                )
            navatara_copy = dict(navatara)
            navatara_copy["nakshatras"] = []
            for position in sequence_list:
                if 1 <= position <= len(ordered_nakshatras):
                    source = ordered_nakshatras[position - 1]
                    navatara_copy["nakshatras"].append(
                        EnrichKundali._nakshatra_item_from_source(source, position)
                    )
            navatara_with_nakshatras.append(navatara_copy)
        return navatara_with_nakshatras

    def build_navatara_payload_for_janma_nakshatra(self, nakshatra_name: str) -> dict[str, Any]:
        ordered = self.rotate_nakshatras_starting_from_janma(nakshatra_name)
        return {
            "input_nakshatra": remove_white_space(nakshatra_name),
            "ordered_nakshatras": ordered,
            "navatara_definitions": list(self.navatara_dict),
            "navatara_with_nakshatras": self.build_navatara_with_nakshatra_rows(ordered),
        }


def resolve_data_json_path(project_root: Path) -> Path:
    """``database/data.json`` (required)."""
    preferred = project_root / DATA_JSON_REL_PATH
    if not preferred.is_file():
        raise FileNotFoundError(f"database file required: {preferred}")
    return preferred


class KundaliBuilder:
    """Build full kundali JSON: chart, enrichment, navatara, UI-ready tables."""

    def __init__(self, project_root: Path) -> None:
        self.root = project_root
        self.planet_db_path = resolve_data_json_path(project_root)
        self.output_dir = project_root / OUTPUT_DIR_REL_PATH

    # --- public API ---

    def build_full_report(
        self,
        date_str: str,
        time_str: str,
        place_query: str,
        house_system: str = DEFAULT_HOUSE_SYSTEM,
    ) -> dict[str, Any]:
        """Birth chart + ``nakshatras`` / ``planets_table`` / ``summary_table`` / ``ui_status_message``."""
        geo = self.geocode_place_name(place_query)
        dt_local = self.parse_birth_datetime_local(date_str, time_str, geo["timezone"])
        chart = self.compute_sidereal_birth_chart(
            dt_local,
            geo["latitude"],
            geo["longitude"],
            {
                "query": place_query,
                "name": geo["name"],
                "admin1": geo.get("admin1"),
                "country": geo.get("country"),
            },
            house_system=house_system,
        )
        if geo.get("alternatives"):
            place = chart.setdefault("place_resolved", {})
            if isinstance(place, dict):
                place["alternatives"] = KundaliBuilder.format_geocode_alternatives(
                    geo["alternatives"]
                )
        EnrichKundali(self.root).enrich_chart_for_api_and_ui(chart)
        return json_stringify_yes_no_values(chart)

    def build_report_with_geo(
        self,
        date_str: str,
        time_str: str,
        place_query: str,
        geo: dict[str, Any],
        house_system: str = DEFAULT_HOUSE_SYSTEM,
    ) -> dict[str, Any]:
        """Like ``build_full_report`` but reuses a prior geocode result (auspicious scans)."""
        dt_local = self.parse_birth_datetime_local(date_str, time_str, geo["timezone"])
        chart = self.compute_sidereal_birth_chart(
            dt_local,
            geo["latitude"],
            geo["longitude"],
            {
                "query": place_query,
                "name": geo["name"],
                "admin1": geo.get("admin1"),
                "country": geo.get("country"),
            },
            house_system=house_system,
        )
        if geo.get("alternatives"):
            place = chart.setdefault("place_resolved", {})
            if isinstance(place, dict):
                place["alternatives"] = KundaliBuilder.format_geocode_alternatives(
                    geo["alternatives"]
                )
        EnrichKundali(self.root).enrich_chart_for_api_and_ui(chart)
        return json_stringify_yes_no_values(chart)

    def house_strength_snapshot_for_datetime(
        self,
        date_str: str,
        time_str: str,
        place_query: str,
        geo: dict[str, Any],
        house_system: str = DEFAULT_HOUSE_SYSTEM,
    ) -> dict[str, Any]:
        """Sidereal chart + house strength total and sign-lord snapshot."""
        dt_local = self.parse_birth_datetime_local(date_str, time_str, geo["timezone"])
        chart = self.compute_sidereal_birth_chart(
            dt_local,
            geo["latitude"],
            geo["longitude"],
            {
                "query": place_query,
                "name": geo["name"],
                "admin1": geo.get("admin1"),
                "country": geo.get("country"),
            },
            house_system=house_system,
        )
        detail = EnrichKundali(self.root).enrich_chart_for_house_strength_detail(chart)
        return {
            "date": date_str,
            "time": time_str,
            **detail,
        }

    def kundali_chart_payload_for_datetime(
        self,
        date_str: str,
        time_str: str,
        place_query: str,
        geo: dict[str, Any],
        house_system: str = DEFAULT_HOUSE_SYSTEM,
    ) -> dict[str, Any]:
        """Minimal ``planets[]`` payload for North Indian chart (auspicious compare columns)."""
        dt_local = self.parse_birth_datetime_local(date_str, time_str, geo["timezone"])
        chart = self.compute_sidereal_birth_chart(
            dt_local,
            geo["latitude"],
            geo["longitude"],
            {
                "query": place_query,
                "name": geo["name"],
                "admin1": geo.get("admin1"),
                "country": geo.get("country"),
            },
            house_system=house_system,
        )
        EnrichKundali(self.root).enrich_chart_for_api_and_ui(chart)
        return EnrichKundali.compact_kundali_chart_payload(chart)

    def houses_strength_for_datetime(
        self,
        date_str: str,
        time_str: str,
        place_query: str,
        geo: dict[str, Any],
        house_system: str = DEFAULT_HOUSE_SYSTEM,
    ) -> int:
        """Fast path: sidereal chart + house strength total only (no file dump / navatara)."""
        return int(
            self.house_strength_snapshot_for_datetime(
                date_str, time_str, place_query, geo, house_system
            )["houses_strength_total"]
        )

    def write_report_to_file(self, report: dict[str, Any], path: Path) -> None:
        from utils.util import write_json_report

        write_json_report(path, report)

    def create_dumps_kundali_chart(
        self,
        date_str: str,
        time_str: str,
        place_query: str,
        house_system: str = DEFAULT_HOUSE_SYSTEM,
    ) -> dict[str, Any]:
        """Build full kundali, write JSON dump to ``output/kundali/``, return report."""
        report = self.build_full_report(date_str, time_str, place_query, house_system)
        dump_path = self.output_dir / self.birth_output_filename(date_str, time_str, place_query)
        self.write_report_to_file(report, dump_path)
        try:
            rel = dump_path.relative_to(self.root)
        except ValueError:
            rel = dump_path
        rel_str = str(rel).replace("\\", "/")
        report["output_json_file"] = rel_str
        return report

    @staticmethod
    def birth_output_filename(date_str: str, time_str: str, place_query: str) -> str:
        """Relative path under ``output/``: ``kundali/{date}_{time}_{place}.json``."""
        parts = time_str.strip().split(":")
        hh = parts[0].zfill(2) if parts else "00"
        mm = parts[1].zfill(2) if len(parts) > 1 else "00"
        ss = parts[2].zfill(2) if len(parts) > 2 else "00"
        slug = re.sub(r"[^a-z0-9]+", "_", place_query.strip().lower())
        slug = re.sub(r"_+", "_", slug).strip("_") or "place"
        if len(slug) > 96:
            slug = slug[:96].rstrip("_")
        return f"{KUNDALI_OUTPUT_SUBDIR}/{date_str.strip()}_{hh}-{mm}-{ss}_{slug}.json"

    def print_debug_tables(self, report: dict[str, Any], stream: Any = sys.stderr) -> None:
        place = report.get("place_resolved") or {}
        print(f"[kundali] {report.get('place_query', '')} -> {place.get('name', '')}", file=stream)
        print(
            f"[kundali] local={report.get('datetime_local_iso', '')}  "
            f"UTC={report.get('datetime_utc_iso', '')}",
            file=stream,
        )
        asc = EnrichKundali.find_ascendant_planet(report) or {}
        moon_n = EnrichKundali.moon_janma_nakshatra(report)
        if moon_n.get("nakshatra"):
            print(
                f"[kundali] Moon janma: {moon_n.get('nakshatra')} (pada {moon_n.get('pada', '')})",
                file=stream,
            )
        for p in report.get("planets") or []:
            print(
                f"  {p.get('name', ''):<8} h={EnrichKundali.planet_house_number(p)} "
                f"{p.get('rashi_english', '')} vs_lord={p.get('planet_relation_with_rashi_lord', UNKNOWN_LABEL)}",
                file=stream,
            )
        print(file=stream)

    # --- geocoding & time ---

    @staticmethod
    def format_geocode_alternatives(results: list[dict[str, Any]]) -> list[dict[str, Any]]:
        out: list[dict[str, Any]] = []
        for row in results or []:
            if not isinstance(row, dict):
                continue
            out.append({
                "name": row.get("name"),
                "country": row.get("country"),
                "timezone": row.get("timezone"),
            })
        return out

    @staticmethod
    def geocode_place_name(place: str) -> dict[str, Any]:
        q = urllib.parse.quote(place.strip())
        url = GEOCODE_API_SEARCH_URL.format(query=q, count=GEOCODE_RESULT_COUNT)
        req = urllib.request.Request(url, headers={"User-Agent": GEOCODE_USER_AGENT})
        try:
            with urllib.request.urlopen(req, timeout=GEOCODE_TIMEOUT_SECONDS) as resp:
                payload = json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            raise RuntimeError(f"Geocoding HTTP error: {e}") from e
        except urllib.error.URLError as e:
            raise RuntimeError(f"Geocoding network error: {e}") from e
        results = payload.get("results") or []
        if not results:
            raise RuntimeError(f"No location found for place: {place!r}")
        best = results[0]
        tz = best.get("timezone")
        if not tz:
            raise RuntimeError("Geocoder did not return a timezone for the first match.")
        return {
            "name": best.get("name"),
            "admin1": best.get("admin1"),
            "country": best.get("country"),
            "latitude": float(best["latitude"]),
            "longitude": float(best["longitude"]),
            "timezone": tz,
            "alternatives": results[1 : 1 + GEOCODE_ALTERNATIVE_COUNT],
        }

    @staticmethod
    def parse_birth_datetime_local(date_str: str, time_str: str, tz_name: str) -> datetime:
        parts = time_str.strip().split(":")
        h = int(parts[0])
        m = int(parts[1]) if len(parts) > 1 else 0
        s = int(parts[2]) if len(parts) > 2 else 0
        y, mo, d = (int(x) for x in date_str.strip().split("-"))
        return datetime(y, mo, d, h, m, s, tzinfo=ZoneInfo(tz_name))

    # --- ephemeris & sidereal chart ---

    def resolve_ephemeris_flags(self) -> int:
        for p in (os.environ.get("SWISSEPH_PATH"), str(self.root / EPHEMERIS_DIR_REL_PATH)):
            if not p:
                continue
            ephe = Path(p)
            if ephe.is_dir():
                try:
                    if any(ephe.iterdir()):
                        swe.set_ephe_path(str(ephe))
                    return swe.FLG_SWIEPH
                except OSError:
                    continue
        swe.set_ephe_path("")
        return swe.FLG_MOSEPH

    def compute_sidereal_birth_chart(
        self,
        dt_local: datetime,
        lat: float,
        lon: float,
        place_meta: dict[str, Any],
        house_system: str = DEFAULT_HOUSE_SYSTEM,
    ) -> dict[str, Any]:
        if dt_local.tzinfo is None:
            raise ValueError("datetime must be timezone-aware (local civil time).")

        dt_utc = dt_local.astimezone(ZoneInfo("UTC"))
        hour_ut = (
            dt_utc.hour + dt_utc.minute / 60.0 + dt_utc.second / 3600.0
            + dt_utc.microsecond / 3.6e9
        )
        jd_ut = swe.julday(dt_utc.year, dt_utc.month, dt_utc.day, hour_ut, swe.GREG_CAL)
        swe.set_sid_mode(swe.SIDM_LAHIRI)
        ayanamsa = float(swe.get_ayanamsa(jd_ut))
        ephe_flags = self.resolve_ephemeris_flags()
        hsys = house_system.encode("ascii")

        cusps, ascmc = swe.houses_ex(jd_ut, lat, lon, hsys, swe.FLG_SIDEREAL)
        asc_lon = float(ascmc[0])
        lagna_idx, lagna_deg, lagna_en, lagna_sa = self.longitude_to_rashi(asc_lon)

        planets_out: list[dict[str, Any]] = []
        for graha in DEFAULT_GRAHA_BODIES:
            plon, spd = self.calc_sidereal_longitude_and_speed(jd_ut, graha.swiss_body_id, ephe_flags)
            ri, din, en, sa = self.longitude_to_rashi(plon)
            planets_out.append({
                "name": graha.key,
                "sidereal_longitude": round(plon, 6),
                "rashi_index": ri,
                "rashi_english": en,
                "rashi_sanskrit": sa,
                "degree_in_rashi": round(din, 4),
                "whole_sign_house": (ri - lagna_idx) % RASHI_COUNT + 1,
                "retrograde": yes_no_str(spd < 0),
            })

        rahu_lon = next(p["sidereal_longitude"] for p in planets_out if p["name"] == "rahu")
        ketu_lon = self.wrap_longitude_to_0_360(rahu_lon + DEGREES_180)
        kr, kd, ken, ksa = self.longitude_to_rashi(ketu_lon)
        rahu_rx = next(p for p in planets_out if p["name"] == "rahu")["retrograde"]
        planets_out.append({
            "name": "ketu",
            "sidereal_longitude": round(ketu_lon, 6),
            "rashi_index": kr,
            "rashi_english": ken,
            "rashi_sanskrit": ksa,
            "degree_in_rashi": round(kd, 4),
            "whole_sign_house": (kr - lagna_idx) % RASHI_COUNT + 1,
            "retrograde": rahu_rx,
        })

        moon_planet = next(p for p in planets_out if p["name"] == "moon")
        nk_i, pada = self.longitude_to_nakshatra_pada(moon_planet["sidereal_longitude"])
        nakshatras = self.load_nakshatra_list_from_database()
        moon_nak = dict(nakshatras[nk_i])
        nakshatra_pada_syllables = moon_nak.pop("pada", None)
        moon_starting_letter = self.starting_name_letter_for_pada(
            {"pada": nakshatra_pada_syllables}, pada
        )
        moon_planet["janma_nakshatra"] = {
            **moon_nak,
            "nakshatra_index": nk_i + 1,
            "pada": pada,
            "starting_name_letter": moon_starting_letter,
        }

        return {
            "place_query": place_meta.get("query"),
            "place_resolved": {
                "name": place_meta.get("name"),
                "admin1": place_meta.get("admin1"),
                "country": place_meta.get("country"),
                "latitude": lat,
                "longitude": lon,
                "timezone": str(dt_local.tzinfo),
            },
            "datetime_local_iso": dt_local.isoformat(),
            "datetime_utc_iso": dt_utc.isoformat(),
            "julian_day_ut": jd_ut,
            "ayanamsa": AYANAMSA_NAME,
            "ayanamsa_degrees": round(ayanamsa, 6),
            "house_system": house_system,
            "planets": planets_out
            + [
                {
                    "name": "ascendant",
                    "sidereal_longitude": round(asc_lon, 6),
                    "rashi_index": lagna_idx,
                    "rashi_english": lagna_en,
                    "rashi_sanskrit": lagna_sa,
                    "degree_in_rashi": round(lagna_deg, 4),
                    "whole_sign_house": 1,
                }
            ],
            "ephemeris": "swiss" if ephe_flags & swe.FLG_SWIEPH else "moshier",
        }

    @staticmethod
    def calc_sidereal_longitude_and_speed(
        jd_ut: float, body: int, ephe_flags: int
    ) -> tuple[float, float]:
        fl = ephe_flags | swe.FLG_SIDEREAL | swe.FLG_SPEED
        try:
            xx, _ = swe.calc_ut(jd_ut, body, fl)
        except swe.Error:
            fl = (ephe_flags & ~swe.FLG_SWIEPH) | swe.FLG_MOSEPH | swe.FLG_SIDEREAL | swe.FLG_SPEED
            xx, _ = swe.calc_ut(jd_ut, body, fl)
        return float(xx[0]), float(xx[3])

    # --- zodiac math ---

    @staticmethod
    def wrap_longitude_to_0_360(lon: float) -> float:
        return lon % FULL_CIRCLE_DEGREES

    @classmethod
    def longitude_to_rashi(cls, lon: float) -> tuple[int, float, str, str]:
        lon = cls.wrap_longitude_to_0_360(lon)
        idx = int(lon // ONE_HOUSE_DEGREES) % RASHI_COUNT
        return idx, lon % ONE_HOUSE_DEGREES, RASHI_IN_ENG[idx], RASHI_IN_SANSKRIT[idx]

    @classmethod
    def longitude_to_nakshatra_pada(cls, lon: float) -> tuple[int, int]:
        lon = cls.wrap_longitude_to_0_360(lon)
        idx = int(lon // ONE_NAKSHATRA_DEGREES) % NAKSHATRA_COUNT
        pada = int((lon % ONE_NAKSHATRA_DEGREES) // (ONE_NAKSHATRA_DEGREES / PADAS_PER_NAKSHATRA)) + 1
        return idx, pada

    @staticmethod
    def starting_name_letter_for_pada(
        nakshatra_entry: dict[str, Any], pada: int
    ) -> str:
        """Namakarana syllable from ``data.json`` nakshatra ``pada`` list."""
        try:
            pada_n = int(pada)
        except (TypeError, ValueError):
            return ""
        for item in nakshatra_entry.get("pada") or []:
            if not isinstance(item, dict):
                continue
            if int(item.get("pada") or 0) == pada_n:
                return str(item.get("starting_name_letter") or "").strip()
        return ""

    # --- database ---

    def load_nakshatra_list_from_database(self) -> list[dict[str, Any]]:
        with self.planet_db_path.open(encoding="utf-8") as f:
            return list(json.load(f)["nakshatras"])


class EnrichKundali:
    """Add planet metadata, summary, nava-tara navatara, and UI-ready table rows to a chart."""

    def __init__(self, project_root: Path) -> None:
        self.root = project_root
        self.planet_db_path = resolve_data_json_path(project_root)

    @staticmethod
    def _required_apply_rule(row: dict[str, Any], *, factor_id: str) -> bool:
        return parse_required_yes_no(
            row.get("apply_rule"),
            field="apply_rule",
            context=f"planet_rules.strength_factors id={factor_id!r}",
        )

    @staticmethod
    def _strength_factor_apply_rule(row: dict[str, Any], *, factor_id: str) -> bool:
        return EnrichKundali._required_apply_rule(row, factor_id=factor_id)

    @staticmethod
    def _required_strength_factor_by_id(
        factors: list[Any], factor_id: str
    ) -> dict[str, Any]:
        row = EnrichKundali._strength_factor_by_id(factors, factor_id)
        if not row:
            raise ValueError(
                f"planet_rules.strength_factors id={factor_id!r} required"
            )
        return row

    @staticmethod
    def _required_strength_factor_apply(
        factors: list[Any], factor_id: str
    ) -> bool:
        row = EnrichKundali._required_strength_factor_by_id(factors, factor_id)
        return EnrichKundali._required_apply_rule(row, factor_id=factor_id)

    @staticmethod
    def _required_apply_from_map(apply: dict[str, bool], factor_id: str) -> bool:
        if factor_id not in apply:
            raise ValueError(
                f"planet_rules.strength_factors id={factor_id!r} missing apply_rule"
            )
        return apply[factor_id]

    @staticmethod
    def _strength_factor_apply_by_id(factors: list[Any]) -> dict[str, bool]:
        apply: dict[str, bool] = {}
        for item in factors:
            if not isinstance(item, dict):
                continue
            fid = remove_white_space(item.get("id", ""))
            if fid:
                apply[fid] = EnrichKundali._required_apply_rule(item, factor_id=fid)
        return apply

    @staticmethod
    def _optional_strength_int(
        row: dict[str, Any], key: str, *, factor_id: str, apply: bool
    ) -> int:
        if not apply:
            return 0
        return EnrichKundali._required_strength_int(row, key, factor_id=factor_id)

    @staticmethod
    def _strength_factor_by_id(
        factors: list[Any], factor_id: str
    ) -> dict[str, Any]:
        key = remove_white_space(factor_id)
        for item in factors:
            if not isinstance(item, dict):
                continue
            if remove_white_space(item.get("id")) == key:
                return item
        return {}

    @staticmethod
    def _required_strength_int(row: dict[str, Any], key: str, *, factor_id: str) -> int:
        if key not in row:
            raise ValueError(
                f"planet_rules.strength_factors id={factor_id!r} missing {key!r}"
            )
        try:
            return int(row[key])
        except (TypeError, ValueError) as exc:
            raise ValueError(
                f"planet_rules.strength_factors id={factor_id!r} invalid {key!r}"
            ) from exc

    @staticmethod
    def resolve_strength_numeric_rules(raw: dict[str, Any]) -> dict[str, int]:
        """Numeric strength knobs from ``data.json`` ``planet_rules.strength_factors``."""
        factors = raw.get("strength_factors")
        if not isinstance(factors, list) or not factors:
            raise ValueError("planet_rules.strength_factors required")

        exalted = EnrichKundali._required_strength_factor_by_id(factors, "exalted")
        debilitated = EnrichKundali._required_strength_factor_by_id(factors, "debilitated")
        own_rashi = EnrichKundali._required_strength_factor_by_id(factors, "own_rashi")
        enemy_rashi = EnrichKundali._required_strength_factor_by_id(factors, "enemy_rashi")
        friend_rashi = EnrichKundali._required_strength_factor_by_id(factors, "friend_rashi")
        own_nakshatra = EnrichKundali._required_strength_factor_by_id(factors, "own_nakshatra")
        enemy_nakshatra = EnrichKundali._required_strength_factor_by_id(factors, "enemy_nakshatra")
        friend_nakshatra = EnrichKundali._required_strength_factor_by_id(factors, "friend_nakshatra")
        retrograde = EnrichKundali._required_strength_factor_by_id(factors, "retrograde")
        dusthana_house = EnrichKundali._required_strength_factor_by_id(factors, "dusthana_house")
        trikona_house = EnrichKundali._required_strength_factor_by_id(factors, "trikona_house")
        good_karakwaqt = EnrichKundali._required_strength_factor_by_id(factors, "good_karakwaqt")
        bad_karakwaqt = EnrichKundali._required_strength_factor_by_id(factors, "bad_karakwaqt")
        combustion = EnrichKundali._required_strength_factor_by_id(factors, "combustion")
        limits = EnrichKundali._required_strength_factor_by_id(factors, "strength_limits")
        death = EnrichKundali._required_strength_factor_by_id(factors, "death_degree")

        apply = EnrichKundali._strength_factor_apply_by_id(factors)

        def on(factor_id: str) -> bool:
            return EnrichKundali._required_apply_from_map(apply, factor_id)

        min_pct = EnrichKundali._required_strength_int(
            limits, "min_percent", factor_id="strength_limits"
        )
        max_pct = EnrichKundali._required_strength_int(
            limits, "max_percent", factor_id="strength_limits"
        )

        return {
            "exalted_bonus": EnrichKundali._optional_strength_int(
                exalted, "increase_strength_percent", factor_id="exalted", apply=on("exalted")
            ),
            "debilitated_penalty": EnrichKundali._optional_strength_int(
                debilitated, "decrease_strength_percent", factor_id="debilitated", apply=on("debilitated")
            ),
            "own_rashi_bonus": EnrichKundali._optional_strength_int(
                own_rashi, "increase_strength_percent", factor_id="own_rashi", apply=on("own_rashi")
            ),
            "enemy_rashi_penalty": EnrichKundali._optional_strength_int(
                enemy_rashi, "decrease_strength_percent", factor_id="enemy_rashi", apply=on("enemy_rashi")
            ),
            "friend_rashi_bonus": EnrichKundali._optional_strength_int(
                friend_rashi, "increase_strength_percent", factor_id="friend_rashi", apply=on("friend_rashi")
            ),
            "own_nakshatra_bonus": EnrichKundali._optional_strength_int(
                own_nakshatra, "increase_strength_percent", factor_id="own_nakshatra", apply=on("own_nakshatra")
            ),
            "enemy_nakshatra_penalty": EnrichKundali._optional_strength_int(
                enemy_nakshatra, "decrease_strength_percent", factor_id="enemy_nakshatra", apply=on("enemy_nakshatra")
            ),
            "friend_nakshatra_bonus": EnrichKundali._optional_strength_int(
                friend_nakshatra, "increase_strength_percent", factor_id="friend_nakshatra", apply=on("friend_nakshatra")
            ),
            "retrograde_bonus": EnrichKundali._optional_strength_int(
                retrograde, "increase_strength_percent", factor_id="retrograde", apply=on("retrograde")
            ),
            "dusthana_house_penalty": EnrichKundali._optional_strength_int(
                dusthana_house, "decrease_strength_percent", factor_id="dusthana_house", apply=on("dusthana_house")
            ),
            "trikona_house_bonus": EnrichKundali._optional_strength_int(
                trikona_house, "increase_strength_percent", factor_id="trikona_house", apply=on("trikona_house")
            ),
            "good_karakwaqt_bonus": EnrichKundali._optional_strength_int(
                good_karakwaqt, "increase_strength_percent", factor_id="good_karakwaqt", apply=on("good_karakwaqt")
            ),
            "bad_karakwaqt_penalty": EnrichKundali._optional_strength_int(
                bad_karakwaqt, "decrease_strength_percent", factor_id="bad_karakwaqt", apply=on("bad_karakwaqt")
            ),
            "combustion_penalty": EnrichKundali._optional_strength_int(
                combustion, "decrease_strength_percent", factor_id="combustion", apply=on("combustion")
            ),
            "min_percent": min_pct,
            "max_percent": max_pct,
            "death_degree_override_percent": EnrichKundali._optional_strength_int(
                death, "increase_strength_percent", factor_id="death_degree", apply=on("death_degree")
            ),
            "strength_factor_apply": apply,
            "apply_strength_limits": on("strength_limits"),
        }

    def load_planet_rules(self) -> dict[str, Any]:
        """Resolved rules from ``data.json`` ``planet_rules`` (degree bands + strength factors)."""
        data = self.load_planet_database()
        raw = data.get("planet_rules")
        if not isinstance(raw, dict):
            raise ValueError("planet_rules required")
        ui_color = raw.get("color_intensity")
        if not isinstance(ui_color, dict):
            raise ValueError("planet_rules.color_intensity required")
        factors = raw.get("strength_factors")
        if not isinstance(factors, list):
            raise ValueError("planet_rules.strength_factors required")
        for row in factors:
            if not isinstance(row, dict):
                continue
            fid = remove_white_space(row.get("id", ""))
            if fid:
                EnrichKundali._required_apply_rule(row, factor_id=fid)
        combustion = EnrichKundali._required_strength_factor_by_id(factors, "combustion")
        dusthana_house = EnrichKundali._required_strength_factor_by_id(factors, "dusthana_house")
        trikona_house = EnrichKundali._required_strength_factor_by_id(factors, "trikona_house")
        dusthana_apply = EnrichKundali._required_apply_rule(
            dusthana_house, factor_id="dusthana_house"
        )
        trikona_apply = EnrichKundali._required_apply_rule(
            trikona_house, factor_id="trikona_house"
        )
        dusthana_houses = (
            EnrichKundali._houses_from_strength_factor(dusthana_house, factor_id="dusthana_house")
            if dusthana_apply
            else frozenset()
        )
        trikona_houses = (
            EnrichKundali._houses_from_strength_factor(trikona_house, factor_id="trikona_house")
            if trikona_apply
            else frozenset()
        )
        good_karakwaqt = EnrichKundali._required_strength_factor_by_id(factors, "good_karakwaqt")
        bad_karakwaqt = EnrichKundali._required_strength_factor_by_id(factors, "bad_karakwaqt")
        good_karakwaqt_apply = EnrichKundali._required_apply_rule(
            good_karakwaqt, factor_id="good_karakwaqt"
        )
        bad_karakwaqt_apply = EnrichKundali._required_apply_rule(
            bad_karakwaqt, factor_id="bad_karakwaqt"
        )
        good_karakwaqt_names = (
            EnrichKundali._karakwaqt_names_from_factor(
                good_karakwaqt, factor_id="good_karakwaqt"
            )
            if good_karakwaqt_apply
            else frozenset()
        )
        bad_karakwaqt_names = (
            EnrichKundali._karakwaqt_names_from_factor(
                bad_karakwaqt, factor_id="bad_karakwaqt"
            )
            if bad_karakwaqt_apply
            else frozenset()
        )
        combustion_apply = EnrichKundali._required_apply_rule(
            combustion, factor_id="combustion"
        )
        combustion_by_planet = combustion.get("max_angular_distance_deg_by_planet")
        if not isinstance(combustion_by_planet, dict):
            raise ValueError(
                "planet_rules strength_factors id='combustion' "
                "missing max_angular_distance_deg_by_planet"
            )
        if combustion_apply:
            if combustion.get("default_max_angular_distance_deg") is None:
                raise ValueError(
                    "planet_rules strength_factors id='combustion' "
                    "missing default_max_angular_distance_deg"
                )
            combustion_default_f = float(combustion["default_max_angular_distance_deg"])
        else:
            combustion_default_f = None
        numeric = EnrichKundali.resolve_strength_numeric_rules(raw)
        if "red_if_death_degree" not in ui_color:
            raise ValueError("planet_rules.color_intensity missing red_if_death_degree")
        red_if_death = parse_required_yes_no(
            ui_color["red_if_death_degree"],
            field="red_if_death_degree",
            context="planet_rules.color_intensity",
        )
        color_intensity: dict[str, Any] = {
            "factor": ui_color.get("factor"),
            "high_green_above_percent": EnrichKundali._required_strength_int(
                ui_color, "high_green_above_percent", factor_id="color_intensity"
            ),
            "red_at_or_below_percent": EnrichKundali._required_strength_int(
                ui_color, "red_at_or_below_percent", factor_id="color_intensity"
            ),
            "red_if_death_degree": yes_no_str(red_if_death),
        }
        aspect_rules = raw.get("aspect_rules")
        if not isinstance(aspect_rules, dict):
            raise ValueError("planet_rules.aspect_rules required")
        by_offset = aspect_rules.get("by_offset")
        if not isinstance(by_offset, list) or not by_offset:
            raise ValueError("planet_rules.aspect_rules.by_offset required")
        planet_aspect_strength_by_id_offset = (
            EnrichKundali.parse_house_strength_aspect_factors(factors)
        )
        return {
            "strength_factors": factors,
            "status_column_color": raw.get("status_column_color"),
            "degree_in_sign_bands": raw.get("degree_in_sign_bands"),
            "aspect_rules": aspect_rules,
            "combustion_default_max_angular_distance_deg": combustion_default_f,
            "combustion_max_angular_distance_deg_by_planet": combustion_by_planet,
            "dusthana_houses": dusthana_houses,
            "trikona_houses": trikona_houses,
            "good_karakwaqt_names": good_karakwaqt_names,
            "bad_karakwaqt_names": bad_karakwaqt_names,
            "planet_aspect_strength_by_id_offset": planet_aspect_strength_by_id_offset,
            **numeric,
            "color_intensity": color_intensity,
        }

    @staticmethod
    def _house_strength_aspect_offset_from_factor(factor: dict[str, Any]) -> int | None:
        """Parse drishti house offset (1–12) from a ``house_rules`` strength factor."""
        try:
            n = int(factor.get("offset"))
        except (TypeError, ValueError):
            return None
        if 1 <= n <= RASHI_COUNT:
            return n
        return None

    @staticmethod
    def _house_strength_factor_entry_from_row(row: dict[str, Any]) -> dict[str, int]:
        entry: dict[str, int] = {}
        if row.get("increase_strength_percent") is not None:
            try:
                entry["increase"] = int(row.get("increase_strength_percent"))
            except (TypeError, ValueError):
                pass
        if row.get("decrease_strength_percent") is not None:
            try:
                entry["decrease"] = int(row.get("decrease_strength_percent"))
            except (TypeError, ValueError):
                pass
        return entry

    @staticmethod
    def parse_house_strength_aspect_factors(
        factors: list[Any],
    ) -> dict[str, dict[int | str, dict[str, int]]]:
        """Group ``house_rules`` factors by id → offset → increase/decrease %."""
        out: dict[str, dict[int | str, dict[str, int]]] = {}
        for row in factors:
            if not isinstance(row, dict):
                continue
            fid = remove_white_space(row.get("id", ""))
            if not fid or fid in ("strength_limits", "clamp"):
                continue
            if not EnrichKundali._required_apply_rule(row, factor_id=fid):
                continue
            entry = EnrichKundali._house_strength_factor_entry_from_row(row)
            if not entry:
                continue
            off = EnrichKundali._house_strength_aspect_offset_from_factor(row)
            if off is None:
                continue
            out.setdefault(fid, {})[off] = entry
        return out

    def load_house_rules(self) -> dict[str, Any]:
        """Resolved knobs from ``data.json`` ``house_rules`` (+ strength_factors)."""
        data = self.load_planet_database()
        raw = data.get("house_rules")
        if not isinstance(raw, dict):
            raise ValueError("house_rules required")
        factors = raw.get("strength_factors")
        if not isinstance(factors, list) or not factors:
            raise ValueError("house_rules.strength_factors required")
        for row in factors:
            if not isinstance(row, dict):
                continue
            fid = remove_white_space(row.get("id", ""))
            if fid:
                EnrichKundali._required_apply_rule(row, factor_id=fid)
        limits = EnrichKundali._required_strength_factor_by_id(factors, "strength_limits")
        if raw.get("base_percent") is None:
            raise ValueError("house_rules.base_percent required")
        try:
            base_pct = int(raw["base_percent"])
        except (TypeError, ValueError) as exc:
            raise ValueError("house_rules.base_percent invalid") from exc
        min_pct = EnrichKundali._required_strength_int(
            limits, "min_percent", factor_id="strength_limits"
        )
        max_pct = EnrichKundali._required_strength_int(
            limits, "max_percent", factor_id="strength_limits"
        )
        aspect_by_id_offset = EnrichKundali.parse_house_strength_aspect_factors(factors)
        formula = str(raw.get("total_strength_percent") or "").strip()
        if formula != "house_strength_percent + planet_strength_percent":
            raise ValueError(
                "house_rules.total_strength_percent must be "
                "'house_strength_percent + planet_strength_percent'"
            )
        return {
            "strength_factors": raw.get("strength_factors"),
            "base_percent": base_pct,
            "aspect_strength_by_id_offset": aspect_by_id_offset,
            "min_percent": min_pct,
            "max_percent": max_pct,
            "apply_strength_limits": EnrichKundali._required_apply_rule(
                limits, factor_id="strength_limits"
            ),
            "total_strength_formula": formula,
        }

    @staticmethod
    def total_strength_percent(
        house_strength_percent: Any,
        planet_strength_percent: Any,
    ) -> int:
        """``house_strength_percent + planet_strength_percent`` from ``data.json``."""
        house = int(round(house_strength_percent)) if isinstance(house_strength_percent, (int, float)) else 0
        planet = (
            int(round(planet_strength_percent))
            if isinstance(planet_strength_percent, (int, float))
            else 0
        )
        return house + planet

    @staticmethod
    def parse_degree_in_sign_bands(
        strength_rules: dict[str, Any],
    ) -> tuple[tuple[float, float, str, int, bool], ...]:
        """(low°, high°, phase name, strength %, apply_rule) tuples from ``planet_rules``."""
        raw = strength_rules.get("degree_in_sign_bands")
        if not isinstance(raw, list) or not raw:
            raise ValueError("planet_rules.degree_in_sign_bands required")
        bands: list[tuple[float, float, str, int, bool]] = []
        for item in raw:
            if not isinstance(item, dict):
                continue
            try:
                lo = float(item["low_deg"])
                hi = float(item["high_deg"])
                phase = str(item["phase"])
                pct = int(item["strength_percent"])
            except (KeyError, TypeError, ValueError) as exc:
                raise ValueError(
                    "planet_rules.degree_in_sign_bands entry invalid"
                ) from exc
            apply = parse_required_yes_no(
                item.get("apply_rule"),
                field="apply_rule",
                context=f"planet_rules.degree_in_sign_bands phase={phase!r}",
            )
            bands.append((lo, hi, phase, pct, apply))
        if not bands:
            raise ValueError("planet_rules.degree_in_sign_bands required")
        return tuple(bands)

    def enrich_chart_for_api_and_ui(self, chart: dict[str, Any]) -> None:
        """Enrich chart in Python; UI reads ``planets_table`` / ``cell_styles`` as-is."""
        friendship = self.load_planet_friendship_lookup_table()
        strength_rules = self.load_planet_rules()
        house_rules = self.load_house_rules()

        chart["planet_rules"] = strength_rules
        chart["house_rules"] = house_rules
        degree_bands = EnrichKundali.parse_degree_in_sign_bands(strength_rules)
        self.attach_planet_karakwaqt(chart)
        self.enrich_birth_planets_with_database_metadata(
            chart, friendship, strength_rules, degree_bands
        )
        self.normalize_moon_nakshatra(chart)
        self.attach_planet_navatara_from_janma(chart)
        self.attach_planet_mahadasha_ages(chart)
        self.attach_house_context_to_planets(chart)
        offsets_by_planet = self.load_planet_aspect_offsets_by_planet()
        self.attach_planet_aspects(chart, offsets_by_planet)
        self.attach_planet_aspected_by(chart)
        self.apply_incoming_aspect_strength_to_planets(
            chart, friendship, strength_rules, offsets_by_planet
        )
        self.attach_death_degree_flags(chart)
        self.attach_planet_table_ui_metadata(chart)
        self.compact_planets_for_api(chart)
        self.add_kundali_summary_block(chart)
        self.add_lunar_calendar_to_summary(chart)
        self.attach_nakshatras_for_moon_janma(chart)
        chart["planets_table"] = self.build_planets_table_rows(chart)
        chart["houses"] = self.build_houses_table_rows(chart)
        chart["houses_strength_total"] = EnrichKundali.houses_strength_total(chart["houses"])
        chart["strength_max"] = int(strength_rules["max_percent"])
        chart["summary_table"] = self.build_summary_table_rows(chart)
        chart["ui_status_message"] = self.build_ui_status_message(chart)
        chart.pop("moon_nakshatra", None)
        chart.pop("ascendant", None)
        chart.pop("planet_rules", None)
        chart.pop("house_rules", None)
        chart.pop("mahadasha_from_birth", None)
        chart.pop("lagna_karak_roles", None)
        alts = chart.pop("geocode_alternatives", None)
        if alts and isinstance(chart.get("place_resolved"), dict):
            pr = chart["place_resolved"]
            if not pr.get("alternatives"):
                pr["alternatives"] = alts if isinstance(alts, list) else []

    def enrich_chart_for_house_strength(self, chart: dict[str, Any]) -> int:
        """Minimal enrich for auspicious scans: house strength total only."""
        return int(
            self.enrich_chart_for_house_strength_detail(chart)["houses_strength_total"]
        )

    def enrich_chart_for_house_strength_detail(
        self, chart: dict[str, Any]
    ) -> dict[str, Any]:
        """House strength total plus sign-lord strength snapshot (auspicious compare)."""
        friendship = self.load_planet_friendship_lookup_table()
        strength_rules = self.load_planet_rules()
        house_rules = self.load_house_rules()
        chart["planet_rules"] = strength_rules
        chart["house_rules"] = house_rules
        degree_bands = EnrichKundali.parse_degree_in_sign_bands(strength_rules)
        self.attach_planet_karakwaqt(chart)
        self.enrich_birth_planets_with_database_metadata(
            chart, friendship, strength_rules, degree_bands
        )
        self.attach_house_context_to_planets(chart)
        offsets_by_planet = self.load_planet_aspect_offsets_by_planet()
        self.attach_planet_aspects(chart, offsets_by_planet)
        self.attach_planet_aspected_by(chart)
        self.apply_incoming_aspect_strength_to_planets(
            chart, friendship, strength_rules, offsets_by_planet
        )
        self.attach_death_degree_flags(chart)
        planets_table = self.build_planets_table_rows(chart)
        houses = self.build_houses_table_rows({**chart, "planets_table": planets_table})
        return {
            "houses_strength_total": EnrichKundali.houses_strength_total(houses),
            "lord_strength": EnrichKundali.lord_strength_snapshot_from_chart(
                chart, strength_rules, friendship
            ),
        }

    @staticmethod
    def houses_ruled_by_sign_lord(
        lagna_rashi_index: int | None,
    ) -> dict[str, list[int]]:
        """Whole-sign house numbers (1–12) ruled by each classical sign lord."""
        if not isinstance(lagna_rashi_index, int):
            return {}
        out: dict[str, list[int]] = {}
        for house_num in range(1, RASHI_COUNT + 1):
            ri = (lagna_rashi_index + house_num - 1) % RASHI_COUNT
            lord = RASHI_SIGN_LORD_IN_ENG[ri]
            out.setdefault(lord, []).append(house_num)
        return out

    @staticmethod
    def planet_lord_strength_relation(
        planet_key: str,
        rashi_english: str,
        strength_rules: dict[str, Any],
        friendship: dict[str, Any],
    ) -> tuple[str, int]:
        """Return (relation label, signed adjustment) for lord comparison cells."""
        pkey = remove_white_space(planet_key).lower()
        rules = friendship.get(pkey) or {}
        rashi = remove_white_space(rashi_english).lower()
        exalted = remove_white_space(rules.get("Exalted", "")).lower()
        debilitated = remove_white_space(rules.get("Debilitated", "")).lower()

        if exalted and rashi == exalted and strength_rules.get("exalted_bonus"):
            return "exalted", int(strength_rules["exalted_bonus"])
        if debilitated and rashi == debilitated and strength_rules.get("debilitated_penalty"):
            return "debilitated", -int(strength_rules["debilitated_penalty"])
        if EnrichKundali.planet_in_own_rashi(pkey, rashi) and strength_rules.get("own_rashi_bonus"):
            return "own", int(strength_rules["own_rashi_bonus"])
        if friendship and EnrichKundali.planet_in_friend_rashi(
            pkey, rashi, friendship
        ) and strength_rules.get("friend_rashi_bonus"):
            return "friend", int(strength_rules["friend_rashi_bonus"])
        if friendship and EnrichKundali.planet_in_enemy_rashi(
            pkey, rashi, friendship
        ) and strength_rules.get("enemy_rashi_penalty"):
            return "enemy", -int(strength_rules["enemy_rashi_penalty"])
        return "neutral", 0

    @staticmethod
    def _lord_factor_entry(
        text: str,
        tone: str,
        *,
        value: int | None = None,
    ) -> dict[str, Any]:
        entry: dict[str, Any] = {"text": text, "tone": tone}
        if value is not None:
            entry["value"] = value
        return entry

    @staticmethod
    def _lord_signed_factor_entry(label: str, value: int) -> dict[str, Any]:
        """One auditable +/- line, e.g. ``enemy -50`` or ``neutral +0``."""
        if value > 0:
            return EnrichKundali._lord_factor_entry(
                f"{label} +{value}", "plus", value=value
            )
        if value < 0:
            return EnrichKundali._lord_factor_entry(
                f"{label} {value}", "minus", value=value
            )
        return EnrichKundali._lord_factor_entry(f"{label} +0", "neutral", value=0)

    @staticmethod
    def planet_strength_factor_entries(
        planet: dict[str, Any],
        strength_rules: dict[str, Any],
        friendship: dict[str, Any],
        *,
        sun_longitude: Any = None,
    ) -> list[dict[str, Any]]:
        """Every +/- term for lord comparison cells; sums to ``planet_strength``."""
        pkey = remove_white_space(planet.get("name", "")).lower()
        rules = friendship.get(pkey) or {}
        rashi = remove_white_space(str(planet.get("rashi_english") or "")).lower()
        entries: list[dict[str, Any]] = []

        if rashi:
            entries.append(EnrichKundali._lord_factor_entry(rashi.title(), "sign"))

        base = planet.get("planet_strength_base")
        if not isinstance(base, (int, float)):
            base = 100
        base_i = int(base)

        exalted = remove_white_space(rules.get("Exalted", "")).lower()
        debilitated = remove_white_space(rules.get("Debilitated", "")).lower()
        if exalted and rashi == exalted and strength_rules.get("exalted_bonus"):
            entries.append(
                EnrichKundali._lord_signed_factor_entry(
                    "exalted", int(strength_rules["exalted_bonus"])
                )
            )
        elif debilitated and rashi == debilitated and strength_rules.get("debilitated_penalty"):
            entries.append(
                EnrichKundali._lord_signed_factor_entry(
                    "debilitated", -int(strength_rules["debilitated_penalty"])
                )
            )
        elif EnrichKundali.planet_in_own_rashi(pkey, rashi) and strength_rules.get("own_rashi_bonus"):
            entries.append(
                EnrichKundali._lord_signed_factor_entry(
                    "own", int(strength_rules["own_rashi_bonus"])
                )
            )
        elif friendship and EnrichKundali.planet_in_friend_rashi(
            pkey, rashi, friendship
        ) and strength_rules.get("friend_rashi_bonus"):
            entries.append(
                EnrichKundali._lord_signed_factor_entry(
                    "friend", int(strength_rules["friend_rashi_bonus"])
                )
            )
        elif friendship and EnrichKundali.planet_in_enemy_rashi(
            pkey, rashi, friendship
        ) and strength_rules.get("enemy_rashi_penalty"):
            entries.append(
                EnrichKundali._lord_signed_factor_entry(
                    "enemy", -int(strength_rules["enemy_rashi_penalty"])
                )
            )
        else:
            entries.append(EnrichKundali._lord_signed_factor_entry("neutral", 0))

        nstatus = remove_white_space(
            str(planet.get("planet_relation_with_nakshatra_lord") or "")
        ).lower()
        own_nak = int(strength_rules.get("own_nakshatra_bonus") or 0)
        friend_nak = int(strength_rules.get("friend_nakshatra_bonus") or 0)
        enemy_nak = int(strength_rules.get("enemy_nakshatra_penalty") or 0)
        if nstatus == PLANET_RELATION_OWN and own_nak:
            entries.append(EnrichKundali._lord_signed_factor_entry("own nakshatra", own_nak))
        elif nstatus == PLANET_RELATION_FRIEND and friend_nak:
            entries.append(
                EnrichKundali._lord_signed_factor_entry("friend nakshatra", friend_nak)
            )
        elif nstatus == PLANET_RELATION_ENEMY and enemy_nak:
            entries.append(
                EnrichKundali._lord_signed_factor_entry("enemy nakshatra", -enemy_nak)
            )

        if is_yes_no(planet.get("retrograde")):
            retro = int(strength_rules.get("retrograde_bonus") or 0)
            if retro:
                entries.append(EnrichKundali._lord_signed_factor_entry("retrograde", retro))

        house = EnrichKundali.planet_house_number(planet)
        dusthana_houses = strength_rules.get("dusthana_houses") or frozenset()
        trikona_houses = strength_rules.get("trikona_houses") or frozenset()
        dusthana_pen = int(strength_rules.get("dusthana_house_penalty") or 0)
        trikona_bonus = int(strength_rules.get("trikona_house_bonus") or 0)
        if isinstance(house, int) and house in dusthana_houses and dusthana_pen:
            entries.append(
                EnrichKundali._lord_signed_factor_entry("dusthana house", -dusthana_pen)
            )
        if isinstance(house, int) and house in trikona_houses and trikona_bonus:
            entries.append(
                EnrichKundali._lord_signed_factor_entry("trikona house", trikona_bonus)
            )

        kw_labels = EnrichKundali.karakwaqt_labels(str(planet.get("planet_karakwaqt") or ""))
        good_names = strength_rules.get("good_karakwaqt_names") or frozenset()
        bad_names = strength_rules.get("bad_karakwaqt_names") or frozenset()
        good_bonus = int(strength_rules.get("good_karakwaqt_bonus") or 0)
        bad_penalty = int(strength_rules.get("bad_karakwaqt_penalty") or 0)
        if good_bonus and good_names and any(label in good_names for label in kw_labels):
            entries.append(EnrichKundali._lord_signed_factor_entry("karak good", good_bonus))
        if bad_penalty and bad_names and any(label in bad_names for label in kw_labels):
            entries.append(EnrichKundali._lord_signed_factor_entry("karak bad", -bad_penalty))

        aspect_order = {
            name: idx for idx, name in enumerate(VIMSHOTTARI_MAHADASHA_SEQUENCE)
        }
        incoming_aspects = planet.get("incoming_aspect_strength")
        if isinstance(incoming_aspects, list):
            sorted_aspects = sorted(
                (row for row in incoming_aspects if isinstance(row, dict)),
                key=lambda row: aspect_order.get(
                    remove_white_space(str(row.get("aspector") or "")).lower(), 99
                ),
            )
            for row in sorted_aspects:
                aspector = remove_white_space(str(row.get("aspector") or "")).lower()
                delta = row.get("delta")
                if not aspector or not isinstance(delta, int) or delta == 0:
                    continue
                entries.append(
                    EnrichKundali._lord_signed_factor_entry(
                        f"{aspector} aspect", delta
                    )
                )

        combustion_pen = int(strength_rules.get("combustion_penalty") or 0)
        if combustion_pen and EnrichKundali.is_planet_combust(
            pkey,
            planet.get("sidereal_longitude"),
            sun_longitude,
            strength_rules,
        ):
            entries.append(
                EnrichKundali._lord_signed_factor_entry("combustion", -combustion_pen)
            )

        running = base_i + sum(
            int(item["value"])
            for item in entries
            if isinstance(item.get("value"), int)
        )
        at_death = (
            str(planet.get("is_planet_at_death_degree") or "").strip().lower()
            == HOUSE_6_8_12_YES
        )
        apply_map = strength_rules.get("strength_factor_apply") or {}
        if at_death and apply_map.get("death_degree"):
            override = int(strength_rules.get("death_degree_override_percent") or 0)
            delta = override - running
            entries.append(
                EnrichKundali._lord_signed_factor_entry("death degree", delta)
            )
            running = override

        strength = planet.get("planet_strength")
        final = int(strength) if isinstance(strength, (int, float)) else running
        apply_limits = strength_rules.get("apply_strength_limits")
        min_pct = int(strength_rules.get("min_percent") or 0)
        max_pct = int(strength_rules.get("max_percent") or 500)
        if apply_limits and final != running:
            entries.append(
                EnrichKundali._lord_signed_factor_entry("clamp", final - running)
            )

        entries.append(
            EnrichKundali._lord_factor_entry(f"= {final}", "total", value=final)
        )
        return entries

    @staticmethod
    def _lord_bracket_factor(name: str, value: int) -> str:
        """Short bracket label, e.g. ``combustion(-60)`` or ``trikona(+45)``."""
        short = remove_white_space(name).replace(" house", "").strip() or name
        if value > 0:
            return f"{short}(+{value})"
        if value < 0:
            return f"{short}({value})"
        return f"{short}(+0)"

    @staticmethod
    def format_lord_strength_factor_display(entries: list[dict[str, Any]]) -> str:
        """``Taurus(exalted +100), combustion(-60)`` with ``= total`` on next line."""
        main, total = EnrichKundali.format_lord_strength_factor_lines(entries)
        if total:
            return f"{main}\n{total}" if main else total
        return main

    @staticmethod
    def format_lord_strength_factor_lines(
        entries: list[dict[str, Any]],
    ) -> tuple[str, str]:
        sign = ""
        rashi_line = ""
        extras: list[str] = []
        total = ""
        rashi_done = False
        for item in entries:
            tone = str(item.get("tone") or "")
            text = str(item.get("text") or "")
            value = item.get("value")
            if tone == "sign":
                sign = text
            elif tone == "total":
                total = text
            elif tone in {"plus", "minus", "neutral"} and not rashi_done:
                rashi_line = f"{sign}({text})" if sign else text
                rashi_done = True
            elif text:
                if isinstance(value, int):
                    label = text.rsplit(" ", 1)[0] if " " in text else text
                    extras.append(EnrichKundali._lord_bracket_factor(label, value))
                else:
                    extras.append(text)
        parts: list[str] = []
        if rashi_line:
            parts.append(rashi_line)
        elif sign:
            parts.append(sign)
        parts.extend(extras)
        return ", ".join(parts), total

    @staticmethod
    def lord_strength_factor_sum(
        entries: list[dict[str, Any]],
        *,
        base: int = 100,
    ) -> int | None:
        """``base`` plus adjustment lines (excludes sign label and ``= total``)."""
        adj_total = 0
        found = False
        for item in entries:
            if item.get("tone") in {"sign", "total"}:
                continue
            value = item.get("value")
            if isinstance(value, int):
                adj_total += value
                found = True
        return (base + adj_total) if found or base else None

    @staticmethod
    def format_lord_strength_cell_display(
        rashi_english: str,
        rashi_relation: str,
        adjustment: int,
    ) -> str:
        """Compact lord cell text: ``Taurus · enemy -50`` (no % total)."""
        rashi = remove_white_space(rashi_english).title() or "—"
        relation = remove_white_space(rashi_relation).lower() or "neutral"
        if adjustment > 0:
            return f"{rashi} · {relation} +{adjustment}"
        if adjustment < 0:
            return f"{rashi} · {relation} {adjustment}"
        return f"{rashi} · {relation}"

    @staticmethod
    def explain_planet_strength_factors(
        planet: dict[str, Any],
        strength_rules: dict[str, Any],
        friendship: dict[str, Any],
        *,
        sun_longitude: Any = None,
    ) -> str:
        """Human-readable Lord% calculation from ``planet_strength_with_dignity_adjustment`` rules."""
        entries = EnrichKundali.planet_strength_factor_entries(
            planet, strength_rules, friendship, sun_longitude=sun_longitude
        )
        return EnrichKundali.format_lord_strength_factor_display(entries)

    @staticmethod
    def lord_strength_snapshot_from_chart(
        chart: dict[str, Any],
        strength_rules: dict[str, Any],
        friendship: dict[str, Any],
    ) -> dict[str, dict[str, Any]]:
        """Planet strength per graha for auspicious slot comparison (includes Rahu/Ketu)."""
        asc = EnrichKundali.find_ascendant_planet(chart) or {}
        lagna_idx = asc.get("rashi_index")
        houses_by_lord = EnrichKundali.houses_ruled_by_sign_lord(lagna_idx)
        order = AUSPICIOUS_LORD_COMPARE_PLANETS
        sun_longitude = None
        for row in chart.get("planets") or []:
            if isinstance(row, dict) and remove_white_space(row.get("name", "")) == "sun":
                lon = row.get("sidereal_longitude")
                if isinstance(lon, (int, float)):
                    sun_longitude = float(lon)
                break
        by_name: dict[str, dict[str, Any]] = {}
        for p in chart.get("planets") or []:
            if not isinstance(p, dict):
                continue
            pkey = remove_white_space(p.get("name", "")).lower()
            if pkey == "ascendant" or pkey not in order:
                continue
            strength = p.get("planet_strength")
            rashi = str(p.get("rashi_english") or "").strip().lower()
            relation, adjustment = EnrichKundali.planet_lord_strength_relation(
                pkey, rashi, strength_rules, friendship
            )
            factors = EnrichKundali.planet_strength_factor_entries(
                p, strength_rules, friendship, sun_longitude=sun_longitude
            )
            base_i = p.get("planet_strength_base")
            if not isinstance(base_i, (int, float)):
                base_i = 100
            base_i = int(base_i)
            display_main, display_total = EnrichKundali.format_lord_strength_factor_lines(
                factors
            )
            by_name[pkey] = {
                "strength_percent": (
                    int(strength) if isinstance(strength, (int, float)) else None
                ),
                "rashi_english": rashi,
                "rashi_relation": relation,
                "adjustment": adjustment,
                "lord_strength_base": base_i,
                "factors": factors,
                "factor_sum": EnrichKundali.lord_strength_factor_sum(
                    factors, base=base_i
                ),
                "display_main": display_main,
                "display_total": display_total,
                "display": EnrichKundali.format_lord_strength_factor_display(factors),
                "houses": houses_by_lord.get(pkey, []),
                "breakdown": EnrichKundali.explain_planet_strength_factors(
                    p, strength_rules, friendship, sun_longitude=sun_longitude
                ),
            }
        return {key: by_name[key] for key in order if key in by_name}

    @staticmethod
    def find_ascendant_planet(chart: dict[str, Any]) -> dict[str, Any] | None:
        for p in chart.get("planets") or []:
            if isinstance(p, dict) and p.get("name") == "ascendant":
                return p
        return None

    @staticmethod
    def lagna_karak_roles(chart: dict[str, Any]) -> dict[str, Any]:
        """Lagna karakwaqt role map on ascendant planet."""
        asc = EnrichKundali.find_ascendant_planet(chart)
        if asc:
            roles = asc.get("lagna_karak_roles")
            if isinstance(roles, dict):
                return roles
        return {}

    @staticmethod
    def find_moon_planet(chart: dict[str, Any]) -> dict[str, Any] | None:
        for p in chart.get("planets") or []:
            if isinstance(p, dict) and p.get("name") == "moon":
                return p
        return None

    @staticmethod
    def moon_janma_nakshatra(chart: dict[str, Any]) -> dict[str, Any]:
        """Janma nakshatra metadata on Moon planet."""
        moon = EnrichKundali.find_moon_planet(chart)
        if not moon:
            raise ValueError("Moon planet required for janma nakshatra")
        jn = moon.get("janma_nakshatra")
        if not isinstance(jn, dict):
            raise ValueError("Moon janma_nakshatra required")
        return jn

    @staticmethod
    def navatara_is_auspicious(navatara: dict[str, Any]) -> bool:
        return str(navatara.get("auspicious", "")).strip().lower() == "yes"

    @staticmethod
    def harmful_navatara_names(definitions: list[dict[str, Any]]) -> frozenset[str]:
        names: set[str] = set()
        for nav in definitions:
            if not isinstance(nav, dict):
                continue
            if str(nav.get("auspicious", "")).strip().lower() == "no":
                name = remove_white_space(str(nav.get("name") or ""))
                if name:
                    names.add(name)
        return frozenset(names)

    @staticmethod
    def vimshottari_lord_for_nakshatra_index(nakshatra_index: Any) -> str:
        """Vimshottari dasha lord from 1-based nakshatra index (1–27)."""
        if not isinstance(nakshatra_index, int) or nakshatra_index < 1:
            return ""
        seq = VIMSHOTTARI_MAHADASHA_SEQUENCE
        return seq[(nakshatra_index - 1) % len(seq)]

    @staticmethod
    def vimshottari_lord_from_janma(mn: dict[str, Any]) -> str:
        """Single Vimshottari lord for Moon janma (not comma-merged display text)."""
        lord = EnrichKundali.vimshottari_lord_for_nakshatra_index(mn.get("nakshatra_index"))
        if lord:
            return lord
        raw = str(mn.get("ruling_planet") or "")
        for part in raw.replace("/", ",").split(","):
            key = remove_white_space(part)
            if key in VIMSHOTTARI_MAHADASHA_SEQUENCE:
                return key
        key = remove_white_space(raw)
        return key if key in VIMSHOTTARI_MAHADASHA_SEQUENCE else ""

    def load_planet_database(self) -> dict[str, Any]:
        with self.planet_db_path.open(encoding="utf-8") as f:
            return json.load(f)

    def load_mahadasha_years_by_planet(self) -> dict[str, float]:
        """Mahadasha length per planet from ``data.json`` ``planets[].mahadasha_years``."""
        data = self.load_planet_database()
        out: dict[str, float] = {}
        for row in data.get("planets") or []:
            if not isinstance(row, dict):
                continue
            pk = remove_white_space(row.get("name"))
            if pk == "ascendant" or not pk:
                continue
            if row.get("mahadasha_years") is None:
                raise ValueError(f"planets[].mahadasha_years required for {pk!r}")
            try:
                out[pk] = float(row["mahadasha_years"])
            except (TypeError, ValueError) as exc:
                raise ValueError(f"planets[].mahadasha_years invalid for {pk!r}") from exc
        if not out:
            raise ValueError("planets[].mahadasha_years required")
        return out

    @staticmethod
    def format_age_years_display(years: float) -> str:
        """Human-readable age from birth (years + months)."""
        if years < 0:
            years = 0.0
        whole_years = int(years)
        months = int(round((years - whole_years) * 12))
        if months >= 12:
            whole_years += 1
            months = 0
        if months:
            return f"{whole_years} years {months} months"
        return f"{whole_years} years"

    @classmethod
    def build_vimshottari_mahadasha_timeline(
        cls,
        moon_sidereal_longitude: float,
        birth_lord: str,
        durations: dict[str, float],
        sequence: tuple[str, ...],
    ) -> list[dict[str, Any]]:
        """One 120-year Vimshottari cycle from birth (balance + full subsequent dashas)."""
        lord = remove_white_space(birth_lord)
        if lord not in sequence:
            return []
        full_years = float(durations.get(lord, 0))
        pos_in_nak = float(moon_sidereal_longitude) % ONE_NAKSHATRA_DEGREES
        fraction_elapsed = pos_in_nak / ONE_NAKSHATRA_DEGREES
        balance = round((1.0 - fraction_elapsed) * full_years, 4)

        periods: list[dict[str, Any]] = []
        age = 0.0
        start_idx = sequence.index(lord)

        def append_period(
            seq_no: int,
            planet: str,
            mahadasha_years: float,
            duration_years: float,
            age_start: float,
            is_birth_balance: bool,
        ) -> None:
            age_end = round(age_start + duration_years, 4)
            periods.append(
                {
                    "sequence": seq_no,
                    "planet": planet,
                    "mahadasha_years": mahadasha_years,
                    "duration_years": round(duration_years, 4),
                    "age_from_years": round(age_start, 4),
                    "age_to_years": age_end,
                    "age_from": cls.format_age_years_display(age_start),
                    "age_to": cls.format_age_years_display(age_end),
                    "is_birth_balance": is_birth_balance,
                }
            )

        append_period(1, lord, full_years, balance, age, True)
        age = balance
        seq_no = 2
        idx = (start_idx + 1) % len(sequence)
        # One pass through all nine lords from birth (do not wrap to a 10th partial period).
        while len(periods) < len(sequence):
            planet = sequence[idx]
            mahadasha_years = float(durations.get(planet, 0))
            duration = mahadasha_years
            append_period(seq_no, planet, mahadasha_years, duration, age, False)
            age += duration
            seq_no += 1
            idx = (idx + 1) % len(sequence)

        return periods

    def attach_planet_mahadasha_ages(self, chart: dict[str, Any]) -> None:
        """Set ``mahadasha_years`` and ``age`` on each birth-chart planet (Vimshottari)."""
        moon_lon = None
        for p in chart.get("planets") or []:
            if isinstance(p, dict) and p.get("name") == "moon":
                lon = p.get("sidereal_longitude")
                if isinstance(lon, (int, float)):
                    moon_lon = float(lon)
                break
        mn = EnrichKundali.moon_janma_nakshatra(chart)
        birth_lord = EnrichKundali.vimshottari_lord_from_janma(mn)
        if moon_lon is None or not birth_lord:
            return

        durations = self.load_mahadasha_years_by_planet()
        periods = self.build_vimshottari_mahadasha_timeline(
            moon_lon,
            birth_lord,
            durations,
            VIMSHOTTARI_MAHADASHA_SEQUENCE,
        )
        period_by_planet: dict[str, dict[str, Any]] = {}
        for period in periods:
            if not isinstance(period, dict):
                continue
            pk = remove_white_space(str(period.get("planet") or ""))
            if pk and pk not in period_by_planet:
                period_by_planet[pk] = period

        for p in chart.get("planets") or []:
            if not isinstance(p, dict):
                continue
            pk = remove_white_space(str(p.get("name") or ""))
            if not pk or pk == "ascendant":
                continue
            if pk in durations:
                p["mahadasha_years"] = durations[pk]
            period = period_by_planet.get(pk)
            if period:
                p["age"] = {
                    "dasha_order": period.get("sequence"),
                    "from_years": period.get("age_from_years"),
                    "to_years": period.get("age_to_years"),
                    "from": period.get("age_from"),
                    "to": period.get("age_to"),
                    "is_birth_balance": period.get("is_birth_balance"),
                }

    def load_houses_for_lookup(self) -> dict[int, list[str]]:
        data = self.load_planet_database()
        lookup: dict[int, list[str]] = {}
        for item in data.get("houses") or []:
            if not isinstance(item, dict):
                continue
            house = item.get("house")
            if isinstance(house, int) and 1 <= house <= 12:
                raw = item.get("for") or []
                lookup[house] = [str(x).strip() for x in raw if str(x).strip()]
        return lookup

    def load_house_one_lagna_roles_by_rashi(self) -> dict[str, dict[str, Any]]:
        """Lagna-specific karak / yog karak / marak / badhak from ``data.json`` house 1."""
        data = self.load_planet_database()
        for item in data.get("houses") or []:
            if not isinstance(item, dict) or item.get("house") != 1:
                continue
            raw = item.get("lagna")
            if isinstance(raw, dict):
                return {str(k).strip().lower(): v for k, v in raw.items() if str(k).strip()}
        raise ValueError("houses[house=1].lagna required in data.json")

    @staticmethod
    def _lagna_role_planet_set(role_value: Any) -> set[str]:
        if isinstance(role_value, str):
            key = remove_white_space(role_value)
            return {key} if key else set()
        if isinstance(role_value, list):
            return {
                remove_white_space(x)
                for x in role_value
                if remove_white_space(x)
            }
        return set()

    KARAKWAQT_HARMFUL_LABELS = frozenset({"marak", "badhak", "prabal marak"})

    @staticmethod
    def build_planet_karakwaqt(
        planet_key: str, lagna_roles: dict[str, Any]
    ) -> tuple[str, str, str]:
        """Display labels and harmful / prabal flags for Karakwaqt column."""
        pk = remove_white_space(planet_key)
        if not pk or not lagna_roles:
            return "", HOUSE_6_8_12_NO, HOUSE_6_8_12_NO
        karak = EnrichKundali._lagna_role_planet_set(lagna_roles.get("karak"))
        yog = EnrichKundali._lagna_role_planet_set(lagna_roles.get("yog_karak"))
        marak = EnrichKundali._lagna_role_planet_set(lagna_roles.get("marak"))
        badhak = EnrichKundali._lagna_role_planet_set(lagna_roles.get("badhak"))
        prabal_pk = remove_white_space(lagna_roles.get("prabal_marak", ""))
        is_prabal = bool(prabal_pk and pk == prabal_pk) or (pk in marak and pk in badhak)
        labels: list[str] = []
        if pk in karak:
            labels.append("karak")
        if pk in yog:
            labels.append("yog karak")
        if is_prabal:
            labels.append("prabal marak")
        else:
            if pk in marak:
                labels.append("marak")
            if pk in badhak:
                labels.append("badhak")
        harmful = (
            HOUSE_6_8_12_YES
            if any(l in EnrichKundali.KARAKWAQT_HARMFUL_LABELS for l in labels)
            else HOUSE_6_8_12_NO
        )
        prabal_flag = HOUSE_6_8_12_YES if is_prabal else HOUSE_6_8_12_NO
        return " | ".join(labels), harmful, prabal_flag

    def attach_planet_karakwaqt(self, chart: dict[str, Any]) -> None:
        """Per-planet lagna roles from ``data.json`` (house 1 ``lagna`` block)."""
        asc = EnrichKundali.find_ascendant_planet(chart) or {}
        lagna_name = remove_white_space(asc.get("rashi_english", "")).lower()
        roles_by_rashi = self.load_house_one_lagna_roles_by_rashi()
        lagna_roles = roles_by_rashi.get(lagna_name) or {}
        if isinstance(asc, dict):
            asc["lagna_karak_roles"] = lagna_roles
        for p in chart.get("planets") or []:
            if not isinstance(p, dict):
                continue
            if remove_white_space(p.get("name", "")) == "ascendant":
                continue
            display, harmful, prabal_flag = self.build_planet_karakwaqt(
                str(p.get("name") or ""), lagna_roles
            )
            p["planet_karakwaqt"] = display
            p["is_planet_karakwaqt_harmful"] = harmful
            p["is_planet_marak_and_badhak"] = prabal_flag

    def load_planet_friendship_lookup_table(self) -> dict[str, Any]:
        data = self.load_planet_database()
        table: dict[str, Any] = {}
        for p in data.get("planets") or []:
            if not isinstance(p, dict):
                continue
            key = remove_white_space(p.get("name", ""))
            if not key or key == "ascendant":
                continue
            table[key] = {
                "Friends": self.read_planet_display_names_from_first_matching_field(
                    p, "friends", "Friends"
                ),
                "Enemies": self.read_planet_display_names_from_first_matching_field(
                    p, "enemies", "Enemies"
                ),
                "Neutral": self.read_planet_display_names_from_first_matching_field(
                    p, "neutral", "Neutral"
                ),
                "Exalted": remove_white_space(p.get("exalted", "")),
                "Debilitated": remove_white_space(p.get("debilitated", "")),
            }
        return table

    def read_planet_display_names_from_first_matching_field(
        self, row: dict[str, Any], *fields: str
    ) -> list[str]:
        for field in fields:
            names = [
                remove_white_space(x)
                for x in row.get(field) or []
                if remove_white_space(x)
            ]
            if names:
                return names
        return []

    def load_nakshatra_list_from_database(self) -> list[dict[str, Any]]:
        data = self.load_planet_database()
        nakshatras = data.get("nakshatras")
        if not isinstance(nakshatras, list) or not nakshatras:
            raise ValueError("nakshatras required in data.json")
        return list(nakshatras)

    def load_planet_aspect_offsets_by_planet(self) -> dict[str, tuple[int, ...]]:
        """Parashari drishti offsets per planet from ``planets[].aspect.offsets``."""
        out: dict[str, tuple[int, ...]] = {}
        data = self.load_planet_database()
        for row in data.get("planets") or []:
            if not isinstance(row, dict):
                continue
            key = remove_white_space(row.get("name", ""))
            if not key or key == "ascendant":
                continue
            raw = row.get("aspect")
            offsets: list[int] | None = None
            if isinstance(raw, dict):
                offsets = raw.get("offsets")
            elif isinstance(raw, list):
                offsets = raw
            if not isinstance(offsets, list):
                continue
            if not offsets:
                out[key] = ()
                continue
            parsed: list[int] = []
            for item in offsets:
                try:
                    n = int(item)
                except (TypeError, ValueError):
                    continue
                if 1 <= n <= RASHI_COUNT:
                    parsed.append(n)
            out[key] = tuple(parsed)
        return out

    @staticmethod
    def house_reached_by_aspect_offset(planet_house: int, offset: int) -> int:
        """Whole-sign house aspected (e.g. Mars in 2nd with offset 4 → 5th house)."""
        return ((int(planet_house) + int(offset) - 2) % RASHI_COUNT) + 1

    @staticmethod
    def aspect_offset_from_aspector_to_target(
        aspector_house: int,
        target_house: int,
        offsets: tuple[int, ...] | list[int],
    ) -> int | None:
        """Drishti offset used when ``aspector_house`` aspects ``target_house``."""
        if not (1 <= int(aspector_house) <= RASHI_COUNT and 1 <= int(target_house) <= RASHI_COUNT):
            return None
        for offset in offsets:
            try:
                off = int(offset)
            except (TypeError, ValueError):
                continue
            if EnrichKundali.house_reached_by_aspect_offset(aspector_house, off) == int(
                target_house
            ):
                return off
        return None

    @staticmethod
    def planet_incoming_aspect_delta_at_offset(
        target_planet_key: str,
        aspector_planet_key: str,
        offset: int,
        friendship: dict[str, Any],
        strength_rules: dict[str, Any],
    ) -> int:
        """Signed strength delta from one incoming drishti (friend / enemy only)."""
        target = remove_white_space(target_planet_key).lower()
        aspector = remove_white_space(aspector_planet_key).lower()
        if not target or not aspector or target == aspector:
            return 0
        relation = EnrichKundali.natural_friendship_with_lord_planet(
            friendship, target, aspector
        )
        aspect_map = strength_rules.get("planet_aspect_strength_by_id_offset") or {}
        if not isinstance(aspect_map, dict):
            aspect_map = {}
        if relation == PLANET_RELATION_FRIEND:
            row = EnrichKundali._house_strength_factor_at_offset(
                aspect_map, "aspect_by_friend_planet", int(offset)
            )
            inc = row.get("increase")
            return int(inc) if inc is not None else 0
        if relation == PLANET_RELATION_ENEMY:
            row = EnrichKundali._house_strength_factor_at_offset(
                aspect_map, "aspect_by_enemy_planet", int(offset)
            )
            dec = row.get("decrease")
            return -int(dec) if dec is not None else 0
        return 0

    def apply_incoming_aspect_strength_to_planets(
        self,
        chart: dict[str, Any],
        friendship: dict[str, Any],
        strength_rules: dict[str, Any],
        offsets_by_planet: dict[str, tuple[int, ...]],
    ) -> None:
        """Apply drishti from friend/enemy grahas to ``planet_strength`` (per-aspector audit)."""
        by_name: dict[str, dict[str, Any]] = {}
        for row in chart.get("planets") or []:
            if isinstance(row, dict):
                key = remove_white_space(row.get("name", "")).lower()
                if key:
                    by_name[key] = row

        apply_limits = strength_rules.get("apply_strength_limits")
        min_pct = int(strength_rules.get("min_percent") or 0)
        max_pct = int(strength_rules.get("max_percent") or 500)

        for p in chart.get("planets") or []:
            if not isinstance(p, dict):
                continue
            pkey = remove_white_space(p.get("name", "")).lower()
            if not pkey or pkey == "ascendant":
                continue
            target_house = EnrichKundali.planet_house_number(p)
            if not isinstance(target_house, int):
                p["incoming_aspect_strength"] = []
                continue

            incoming: list[dict[str, Any]] = []
            aspectors = p.get("aspected_by")
            if not isinstance(aspectors, list):
                aspectors = []

            for aspector_key in aspectors:
                ak = remove_white_space(str(aspector_key or "")).lower()
                if not ak or ak == pkey:
                    continue
                aspector = by_name.get(ak)
                if not isinstance(aspector, dict):
                    continue
                aspector_house = EnrichKundali.planet_house_number(aspector)
                if not isinstance(aspector_house, int):
                    continue
                offset = EnrichKundali.aspect_offset_from_aspector_to_target(
                    aspector_house,
                    target_house,
                    offsets_by_planet.get(ak, ()),
                )
                if offset is None:
                    continue
                delta = EnrichKundali.planet_incoming_aspect_delta_at_offset(
                    pkey, ak, offset, friendship, strength_rules
                )
                if delta == 0:
                    continue
                incoming.append({
                    "aspector": ak,
                    "offset": offset,
                    "delta": delta,
                })

            p["incoming_aspect_strength"] = incoming
            if not incoming:
                continue
            strength = p.get("planet_strength")
            if not isinstance(strength, (int, float)):
                continue
            adjusted = int(strength) + sum(int(row["delta"]) for row in incoming)
            if apply_limits:
                adjusted = max(min_pct, min(max_pct, adjusted))
            p["planet_strength"] = adjusted
            phase = p.get("sign_degree_phase")
            if isinstance(phase, dict):
                phase["strength_percent"] = adjusted
                phase["label"] = f"{adjusted}%"

    @staticmethod
    def planet_in_debilitated_rashi(
        planet_key: str, rashi_english: str, friendship: dict[str, Any]
    ) -> bool:
        """True when ``rashi_english`` is the debilitated sign of ``planet_key``."""
        pkey = remove_white_space(planet_key).lower()
        rashi = remove_white_space(rashi_english).lower()
        if not pkey or not rashi:
            return False
        rules = friendship.get(pkey) or {}
        debilitated = remove_white_space(rules.get("Debilitated", "")).lower()
        return bool(debilitated and rashi == debilitated)

    @staticmethod
    def planet_in_exalted_rashi(
        planet_key: str, rashi_english: str, friendship: dict[str, Any]
    ) -> bool:
        """True when ``rashi_english`` is the exalted sign of ``planet_key``."""
        pkey = remove_white_space(planet_key).lower()
        rashi = remove_white_space(rashi_english).lower()
        if not pkey or not rashi:
            return False
        rules = friendship.get(pkey) or {}
        exalted = remove_white_space(rules.get("Exalted", "")).lower()
        return bool(exalted and rashi == exalted)

    @staticmethod
    def planet_in_enemy_rashi(
        planet_key: str, rashi_english: str, friendship: dict[str, Any]
    ) -> bool:
        """True when the sign lord of ``rashi_english`` is a natural enemy of ``planet_key``."""
        pkey = remove_white_space(planet_key).lower()
        rashi = remove_white_space(rashi_english).lower()
        if not pkey or not rashi:
            return False
        try:
            ri = RASHI_IN_ENG.index(rashi)
        except ValueError:
            return False
        status, _ = EnrichKundali.natural_friendship_with_sign_lord(friendship, pkey, ri)
        return status == PLANET_RELATION_ENEMY

    @staticmethod
    def planet_in_friend_rashi(
        planet_key: str, rashi_english: str, friendship: dict[str, Any]
    ) -> bool:
        """True when the sign lord of ``rashi_english`` is a natural friend of ``planet_key``."""
        pkey = remove_white_space(planet_key).lower()
        rashi = remove_white_space(rashi_english).lower()
        if not pkey or not rashi:
            return False
        try:
            ri = RASHI_IN_ENG.index(rashi)
        except ValueError:
            return False
        status, _ = EnrichKundali.natural_friendship_with_sign_lord(friendship, pkey, ri)
        return status == PLANET_RELATION_FRIEND

    @staticmethod
    def _house_strength_factor_at_offset(
        aspect_by_id_offset: dict[str, dict[Any, dict[str, int]]],
        factor_id: str,
        offset: int,
    ) -> dict[str, int]:
        bucket = aspect_by_id_offset.get(factor_id) or {}
        row = bucket.get(offset) or bucket.get(str(offset))
        return row if isinstance(row, dict) else {}

    @staticmethod
    def house_strength_delta_at_offset_for_rashi(
        planet_key: str,
        rashi_english: str,
        offset: int,
        friendship: dict[str, Any],
        house_rules: dict[str, Any],
    ) -> int:
        """Rashi-rule delta for one drishti offset from ``house_rules`` strength_factors."""
        pkey = remove_white_space(planet_key).lower()
        rashi_en = str(rashi_english or "").strip()
        if not pkey or pkey == "ascendant" or not rashi_en:
            return 0
        aspect_map = house_rules.get("aspect_strength_by_id_offset") or {}
        if not isinstance(aspect_map, dict):
            aspect_map = {}

        delta = 0
        own = EnrichKundali._house_strength_factor_at_offset(
            aspect_map, "aspect_by_own_rashi_planet", offset
        )
        if own.get("increase") is not None and EnrichKundali.planet_in_own_rashi(pkey, rashi_en):
            delta += int(own["increase"])

        deb = EnrichKundali._house_strength_factor_at_offset(
            aspect_map, "aspect_by_debilitated_rashi_planet", offset
        )
        enemy = EnrichKundali._house_strength_factor_at_offset(
            aspect_map, "aspect_by_enemy_rashi_planet", offset
        )
        if deb.get("decrease") is not None and EnrichKundali.planet_in_debilitated_rashi(
            pkey, rashi_en, friendship
        ):
            delta -= int(deb["decrease"])
        elif enemy.get("decrease") is not None and EnrichKundali.planet_in_enemy_rashi(
            pkey, rashi_en, friendship
        ):
            delta -= int(enemy["decrease"])

        ex = EnrichKundali._house_strength_factor_at_offset(
            aspect_map, "aspect_by_exalted_rashi_planet", offset
        )
        friend = EnrichKundali._house_strength_factor_at_offset(
            aspect_map, "aspect_by_friend_rashi_planet", offset
        )
        if ex.get("increase") is not None and EnrichKundali.planet_in_exalted_rashi(
            pkey, rashi_en, friendship
        ):
            delta += int(ex["increase"])
        elif friend.get("increase") is not None and EnrichKundali.planet_in_friend_rashi(
            pkey, rashi_en, friendship
        ):
            delta += int(friend["increase"])
        return delta

    @staticmethod
    def house_strength_delta_from_planet_aspects(
        planet_key: str,
        planet_house: int | None,
        houses_by_num: dict[int, dict[str, Any]],
        friendship: dict[str, Any],
        house_rules: dict[str, Any],
        offsets_by_planet: dict[str, tuple[int, ...]],
    ) -> int:
        """Sum drishti deltas for all offsets the graha casts (from ``planets[].aspect.offsets``)."""
        if not isinstance(planet_house, int) or not (1 <= planet_house <= RASHI_COUNT):
            return 0
        pkey = remove_white_space(planet_key).lower()
        if not pkey or pkey == "ascendant":
            return 0
        offsets = offsets_by_planet.get(pkey, ())
        total = 0
        for offset in offsets:
            target = EnrichKundali.house_reached_by_aspect_offset(planet_house, offset)
            ws = houses_by_num.get(target) or {}
            rashi_en = str(ws.get("rashi_english") or "").strip()
            total += EnrichKundali.house_strength_delta_at_offset_for_rashi(
                pkey, rashi_en, int(offset), friendship, house_rules
            )
        return total

    @staticmethod
    def empty_house_strength_delta_from_aspects(
        house_num: int,
        chart: dict[str, Any],
        houses_by_num: dict[int, dict[str, Any]],
        friendship: dict[str, Any],
        house_rules: dict[str, Any],
        offsets_by_planet: dict[str, tuple[int, ...]],
    ) -> int:
        """Sum per-graha drishti adjustments onto ``house_num`` (all offsets, area-scaled)."""
        if not isinstance(house_num, int) or not (1 <= house_num <= RASHI_COUNT):
            return 0
        ws_h = houses_by_num.get(house_num) or {}
        rashi_en = str(ws_h.get("rashi_english") or "").strip()
        if not rashi_en:
            return 0
        total = 0
        for op in chart.get("planets") or []:
            if not isinstance(op, dict):
                continue
            ok = remove_white_space(op.get("name", "")).lower()
            if not ok or ok == "ascendant":
                continue
            ph = EnrichKundali.planet_house_number(op)
            if not isinstance(ph, int):
                continue
            offsets = offsets_by_planet.get(ok, ())
            for offset in offsets:
                if EnrichKundali.house_reached_by_aspect_offset(ph, int(offset)) != house_num:
                    continue
                total += EnrichKundali.house_strength_delta_at_offset_for_rashi(
                    ok, rashi_en, int(offset), friendship, house_rules
                )
        return total

    @staticmethod
    def aspect_houses_from_offsets(planet_house: int | None, offsets: tuple[int, ...]) -> list[int]:
        if not isinstance(planet_house, int) or not offsets:
            return []
        return [
            EnrichKundali.house_reached_by_aspect_offset(planet_house, off)
            for off in offsets
        ]

    @staticmethod
    def normalize_house_numbers(houses: Any) -> list[int]:
        """Coerce aspect house list entries to ints 1–12 (JSON may use strings)."""
        if not isinstance(houses, list):
            return []
        out: list[int] = []
        for item in houses:
            try:
                n = int(item)
            except (TypeError, ValueError):
                continue
            if 1 <= n <= RASHI_COUNT:
                out.append(n)
        return out

    def attach_planet_aspects(
        self, chart: dict[str, Any], offsets_by_planet: dict[str, tuple[int, ...]]
    ) -> None:
        """Set ``aspect`` on each graha: offsets from DB + houses for this chart."""
        for p in chart.get("planets") or []:
            if not isinstance(p, dict):
                continue
            pkey = remove_white_space(p.get("name", ""))
            if not pkey or pkey == "ascendant":
                continue
            offsets = offsets_by_planet.get(pkey, ())
            hn = EnrichKundali.planet_house_number(p)
            p["aspect"] = {
                "offsets": list(offsets),
                "houses": EnrichKundali.aspect_houses_from_offsets(hn, offsets),
            }

    @staticmethod
    def format_planet_names_csv(planet_keys: list[str]) -> str:
        order = {name: idx for idx, name in enumerate(VIMSHOTTARI_MAHADASHA_SEQUENCE)}
        keys = [remove_white_space(k) for k in planet_keys if remove_white_space(k)]
        keys = sorted(set(keys), key=lambda k: order.get(k, 99))
        return ", ".join(k.title() for k in keys)

    @staticmethod
    def aspectors_by_house_from_chart(chart: dict[str, Any]) -> dict[int, list[str]]:
        """Graha names whose drishti hits each whole-sign house (1–12)."""
        aspectors_by_house: dict[int, list[str]] = {hn: [] for hn in range(1, RASHI_COUNT + 1)}
        for other in chart.get("planets") or []:
            if not isinstance(other, dict):
                continue
            other_key = remove_white_space(other.get("name", ""))
            if not other_key or other_key == "ascendant":
                continue
            aspect = other.get("aspect")
            raw_houses = aspect.get("houses") if isinstance(aspect, dict) else None
            for hn in EnrichKundali.normalize_house_numbers(raw_houses):
                aspectors_by_house[hn].append(other_key)
        return aspectors_by_house

    def attach_planet_aspected_by(self, chart: dict[str, Any]) -> None:
        """Set ``aspected_by`` on each graha: other planets whose drishti hits its house."""
        aspectors_by_house = EnrichKundali.aspectors_by_house_from_chart(chart)
        for p in chart.get("planets") or []:
            if not isinstance(p, dict):
                continue
            if remove_white_space(p.get("name", "")) in ("", "ascendant"):
                continue
            target_house = EnrichKundali.planet_house_number(p)
            if not isinstance(target_house, int):
                p["aspected_by"] = []
                continue
            p["aspected_by"] = list(aspectors_by_house.get(target_house, []))

    def load_death_degree_rules(self) -> dict[str, list[dict[str, Any]]]:
        """Mrityu Bhaga rules per ``planets[]`` name (lagna uses ``ascendant``)."""
        data = self.load_planet_database()
        by_planet: dict[str, list[dict[str, Any]]] = {}
        for row in data.get("planets") or []:
            if not isinstance(row, dict):
                continue
            key = remove_white_space(row.get("name", ""))
            rules = row.get("death_degree")
            if key and isinstance(rules, list):
                by_planet[key] = [r for r in rules if isinstance(r, dict)]
        if "ascendant" not in by_planet:
            lagna_rules = data.get("death_degree_lagna")
            if isinstance(lagna_rules, list):
                by_planet["ascendant"] = [r for r in lagna_rules if isinstance(r, dict)]
        return by_planet

    def enrich_birth_planets_with_database_metadata(
        self,
        chart: dict[str, Any],
        friendship: dict[str, Any],
        strength_rules: dict[str, Any],
        degree_bands: tuple[tuple[float, float, str, int, bool], ...] | None = None,
    ) -> None:
        nakshatra_list = self.load_nakshatra_list_from_database()
        sun_longitude = None
        for row in chart.get("planets") or []:
            if not isinstance(row, dict):
                continue
            if remove_white_space(row.get("name", "")) != "sun":
                continue
            lon = row.get("sidereal_longitude")
            if isinstance(lon, (int, float)):
                sun_longitude = float(lon)
            break
        asc = EnrichKundali.find_ascendant_planet(chart) or {}
        lagna_rashi_index = asc.get("rashi_index")
        for p in chart.get("planets") or []:
            if not isinstance(p, dict):
                continue
            pkey = remove_white_space(p.get("name", ""))
            if pkey == "ascendant":
                continue
            ri = p.get("rashi_index")
            if isinstance(ri, int):
                status, sign_lord = self.natural_friendship_with_sign_lord(
                    friendship, pkey, ri
                )
            else:
                status, sign_lord = UNKNOWN_LABEL, ""
            p["planet_relation_with_rashi_lord"] = status
            p["sign_lord"] = sign_lord
            dignity: str | None = None
            dusthana_houses = strength_rules["dusthana_houses"]
            planet_house = EnrichKundali.planet_house_number(p)
            p["is_planet_in_6_8_12_house"] = self.dusthana_house_flag(
                planet_house, dusthana_houses
            )
            p["is_planet_lagna_lord_enemy"] = self.lagna_lord_enemy_flag(
                friendship, pkey, lagna_rashi_index
            )
            nakshatra_lord_status = UNKNOWN_LABEL
            lon = p.get("sidereal_longitude")
            if isinstance(lon, (int, float)) and nakshatra_list:
                nk_i, pada = KundaliBuilder.longitude_to_nakshatra_pada(float(lon))
                nak = dict(nakshatra_list[nk_i])
                p["nakshatra"] = nak.get("nakshatra") or ""
                p["nakshatra_pada"] = pada
                p["nakshatra_ruling_planet"] = nak.get("ruling_planet") or ""
                nlord = VIMSHOTTARI_MAHADASHA_SEQUENCE[
                    nk_i % len(VIMSHOTTARI_MAHADASHA_SEQUENCE)
                ]
                nakshatra_lord_status = EnrichKundali.natural_friendship_with_lord_planet(
                    friendship, pkey, nlord
                )
                p["planet_relation_with_nakshatra_lord"] = nakshatra_lord_status
                p["planet_status_in_nakshatra"] = EnrichKundali.planet_status_for_ui(
                    nakshatra_lord_status, None
                )
            else:
                p["nakshatra"] = ""
                p.pop("nakshatra_pada", None)
                p.pop("nakshatra_ruling_planet", None)
                p["planet_relation_with_nakshatra_lord"] = UNKNOWN_LABEL
                p["planet_status_in_nakshatra"] = UNKNOWN_LABEL
            din = p.get("degree_in_rashi")
            if isinstance(din, (int, float)):
                phase = self.degree_phase_within_sign(float(din), degree_bands)
                p["sign_degree_phase"] = phase
                p.pop("degree_in_rashi", None)
                base_strength = phase.get("strength_percent")
                p["planet_strength_base"] = base_strength
                strength, dignity = self.planet_strength_with_dignity_adjustment(
                    pkey,
                    str(p.get("rashi_english") or ""),
                    base_strength,
                    friendship.get(pkey) or {},
                    strength_rules,
                    friendship=friendship,
                    retrograde=is_yes_no(p.get("retrograde")),
                    planet_longitude=p.get("sidereal_longitude"),
                    sun_longitude=sun_longitude,
                    whole_sign_house=EnrichKundali.planet_house_number(p),
                    nakshatra_lord_status=nakshatra_lord_status,
                    planet_karakwaqt=str(p.get("planet_karakwaqt") or ""),
                )
                p["planet_strength"] = strength
                if dignity:
                    p["planet_dignity"] = dignity
                else:
                    p.pop("planet_dignity", None)
                if isinstance(strength, (int, float)) and isinstance(p.get("sign_degree_phase"), dict):
                    p["sign_degree_phase"]["strength_percent"] = strength
                    p["sign_degree_phase"]["label"] = f"{strength}%"
            else:
                p["sign_degree_phase"] = None
                p["planet_strength"] = None
                p.pop("planet_strength_base", None)
                p.pop("planet_dignity", None)
            if not dignity and pkey:
                dignity = EnrichKundali.planet_dignity_from_sign(
                    pkey, str(p.get("rashi_english") or ""), friendship
                )
            p["planet_status_in_rashi"] = EnrichKundali.planet_status_for_ui(
                status, dignity
            )

    @staticmethod
    def planet_in_own_rashi(planet_key: str, rashi_english: str) -> bool:
        """True when ``planet_key`` rules the sign given by ``rashi_english``."""
        pkey = remove_white_space(planet_key).lower()
        rashi = remove_white_space(rashi_english).lower()
        if not pkey or not rashi:
            return False
        try:
            ri = RASHI_IN_ENG.index(rashi)
        except ValueError:
            return False
        return pkey == RASHI_SIGN_LORD_IN_ENG[ri]

    @staticmethod
    def planet_dignity_from_sign(
        planet_key: str, rashi_english: str, friendship: dict[str, Any]
    ) -> str | None:
        rashi = remove_white_space(rashi_english).lower()
        rules = friendship.get(planet_key) or {}
        exalted = remove_white_space(rules.get("Exalted", "")).lower()
        debilitated = remove_white_space(rules.get("Debilitated", "")).lower()
        if exalted and rashi == exalted:
            return PLANET_DIGNITY_EXALTED
        if debilitated and rashi == debilitated:
            return PLANET_DIGNITY_DEBILITATED
        return None

    @staticmethod
    def planet_status_for_ui(natural_status: str, dignity: str | None) -> str:
        if dignity == PLANET_DIGNITY_EXALTED:
            return PLANET_STATUS_HIGH
        if dignity == PLANET_DIGNITY_DEBILITATED:
            return PLANET_STATUS_LOW
        return natural_status or UNKNOWN_LABEL

    @staticmethod
    def planet_strength_with_dignity_adjustment(
        planet_key: str,
        rashi_english: str,
        base_strength: Any,
        rules: dict[str, Any],
        strength_rules: dict[str, Any],
        *,
        friendship: dict[str, Any] | None = None,
        retrograde: bool = False,
        planet_longitude: Any = None,
        sun_longitude: Any = None,
        whole_sign_house: Any = None,
        nakshatra_lord_status: str | None = None,
        planet_karakwaqt: str = "",
    ) -> tuple[int | None, str | None]:
        if not isinstance(base_strength, (int, float)):
            return None, None
        rashi = remove_white_space(rashi_english).lower()
        exalted = remove_white_space(rules.get("Exalted", "")).lower()
        debilitated = remove_white_space(rules.get("Debilitated", "")).lower()
        dignity: str | None = None
        adjusted = int(base_strength)
        bonus = int(strength_rules["exalted_bonus"])
        penalty = int(strength_rules["debilitated_penalty"])
        own_bonus = int(strength_rules["own_rashi_bonus"])
        enemy_penalty = int(strength_rules["enemy_rashi_penalty"])
        friend_bonus = int(strength_rules["friend_rashi_bonus"])
        own_nakshatra_bonus = int(strength_rules["own_nakshatra_bonus"])
        enemy_nakshatra_penalty = int(strength_rules["enemy_nakshatra_penalty"])
        friend_nakshatra_bonus = int(strength_rules["friend_nakshatra_bonus"])
        retro_bonus = int(strength_rules["retrograde_bonus"])
        dusthana_penalty = int(strength_rules["dusthana_house_penalty"])
        dusthana_houses = strength_rules["dusthana_houses"]
        trikona_bonus = int(strength_rules["trikona_house_bonus"])
        trikona_houses = strength_rules["trikona_houses"]
        good_karakwaqt_bonus = int(strength_rules["good_karakwaqt_bonus"])
        bad_karakwaqt_penalty = int(strength_rules["bad_karakwaqt_penalty"])
        good_karakwaqt_names = strength_rules["good_karakwaqt_names"]
        bad_karakwaqt_names = strength_rules["bad_karakwaqt_names"]
        combustion_penalty = int(strength_rules["combustion_penalty"])
        min_pct = int(strength_rules["min_percent"])
        max_pct = int(strength_rules["max_percent"])
        apply_limits = strength_rules["apply_strength_limits"]
        if exalted and rashi == exalted:
            dignity = PLANET_DIGNITY_EXALTED
            adjusted += bonus
        elif debilitated and rashi == debilitated:
            dignity = PLANET_DIGNITY_DEBILITATED
            adjusted -= penalty
        elif EnrichKundali.planet_in_own_rashi(planet_key, rashi_english):
            adjusted += own_bonus
        elif friendship and EnrichKundali.planet_in_friend_rashi(
            planet_key, rashi_english, friendship
        ):
            adjusted += friend_bonus
        elif friendship and EnrichKundali.planet_in_enemy_rashi(
            planet_key, rashi_english, friendship
        ):
            adjusted -= enemy_penalty
        nstatus = remove_white_space(nakshatra_lord_status or "").lower()
        if nstatus == PLANET_RELATION_OWN:
            adjusted += own_nakshatra_bonus
        elif nstatus == PLANET_RELATION_FRIEND:
            adjusted += friend_nakshatra_bonus
        elif nstatus == PLANET_RELATION_ENEMY:
            adjusted -= enemy_nakshatra_penalty
        if retrograde:
            adjusted += retro_bonus
        if (
            isinstance(whole_sign_house, int)
            and whole_sign_house in dusthana_houses
        ):
            adjusted -= dusthana_penalty
        if (
            isinstance(whole_sign_house, int)
            and whole_sign_house in trikona_houses
        ):
            adjusted += trikona_bonus
        adjusted += EnrichKundali.karakwaqt_strength_delta(
            planet_karakwaqt,
            good_karakwaqt_names,
            bad_karakwaqt_names,
            good_karakwaqt_bonus,
            bad_karakwaqt_penalty,
        )
        if EnrichKundali.is_planet_combust(
            planet_key,
            planet_longitude,
            sun_longitude,
            strength_rules,
        ):
            adjusted -= combustion_penalty
        if apply_limits:
            adjusted = max(min_pct, min(max_pct, adjusted))
        return adjusted, dignity

    @staticmethod
    def shortest_angular_distance_degrees(a: float, b: float) -> float:
        """Absolute shortest angular distance in degrees on a 360° circle."""
        delta = abs((float(a) - float(b)) % 360.0)
        return min(delta, 360.0 - delta)

    @staticmethod
    def is_planet_combust(
        planet_key: str,
        planet_longitude: Any,
        sun_longitude: Any,
        strength_rules: dict[str, Any],
    ) -> bool:
        """True when planet is within configured combustion distance from Sun."""
        if not strength_rules["strength_factor_apply"]["combustion"]:
            return False
        pkey = remove_white_space(planet_key).lower()
        if pkey in {"", "sun", "ascendant", "rahu", "ketu"}:
            return False
        if not isinstance(planet_longitude, (int, float)) or not isinstance(sun_longitude, (int, float)):
            return False
        thresholds = strength_rules["combustion_max_angular_distance_deg_by_planet"]
        if not isinstance(thresholds, dict):
            raise ValueError(
                "planet_rules combustion_max_angular_distance_deg_by_planet required"
            )
        threshold = thresholds.get(pkey)
        if threshold is None:
            default_max = strength_rules["combustion_default_max_angular_distance_deg"]
            if default_max is None:
                raise ValueError(
                    "planet_rules strength_factors id='combustion' "
                    "missing default_max_angular_distance_deg"
                )
            threshold = default_max
        max_deg = float(threshold)
        if max_deg <= 0:
            return False
        return EnrichKundali.shortest_angular_distance_degrees(
            float(planet_longitude), float(sun_longitude)
        ) < max_deg

    @staticmethod
    def natural_friendship_with_lord_planet(
        friendship: dict[str, Any], planet_key: str, lord_key: str
    ) -> str:
        if not planet_key or not lord_key:
            return UNKNOWN_LABEL
        if planet_key == lord_key:
            return PLANET_RELATION_OWN
        row = friendship.get(planet_key)
        if not isinstance(row, dict):
            return UNKNOWN_LABEL
        friends = [remove_white_space(x) for x in (row.get("Friends") or [])]
        enemies = [remove_white_space(x) for x in (row.get("Enemies") or [])]
        neutrals = [remove_white_space(x) for x in (row.get("Neutral") or [])]
        if lord_key in friends:
            return PLANET_RELATION_FRIEND
        if lord_key in enemies:
            return PLANET_RELATION_ENEMY
        if lord_key in neutrals:
            return PLANET_RELATION_NEUTRAL
        return UNKNOWN_LABEL

    @staticmethod
    def natural_friendship_with_sign_lord(
        friendship: dict[str, Any], planet_key: str, rashi_index: int
    ) -> tuple[str, str]:
        if not planet_key or not (0 <= rashi_index < RASHI_COUNT):
            return UNKNOWN_LABEL, ""
        sign_lord = RASHI_SIGN_LORD_IN_ENG[rashi_index]
        status = EnrichKundali.natural_friendship_with_lord_planet(
            friendship, planet_key, sign_lord
        )
        return status, sign_lord

    @staticmethod
    def _karakwaqt_names_from_factor(
        factor: dict[str, Any], *, factor_id: str
    ) -> frozenset[str]:
        names_raw = factor.get("karakwaqt_names")
        if not isinstance(names_raw, list) or not names_raw:
            raise ValueError(
                f"planet_rules.strength_factors id={factor_id!r} missing karakwaqt_names"
            )
        parsed = {remove_white_space(x) for x in names_raw if remove_white_space(x)}
        if not parsed:
            raise ValueError(
                f"planet_rules.strength_factors id={factor_id!r} invalid karakwaqt_names"
            )
        return frozenset(parsed)

    @staticmethod
    def karakwaqt_labels(planet_karakwaqt: str) -> tuple[str, ...]:
        return tuple(
            remove_white_space(part)
            for part in str(planet_karakwaqt or "").split("|")
            if remove_white_space(part)
        )

    @staticmethod
    def karakwaqt_strength_delta(
        planet_karakwaqt: str,
        good_names: frozenset[str],
        bad_names: frozenset[str],
        good_bonus: int,
        bad_penalty: int,
    ) -> int:
        labels = EnrichKundali.karakwaqt_labels(planet_karakwaqt)
        if not labels:
            return 0
        delta = 0
        if good_names and any(label in good_names for label in labels):
            delta += good_bonus
        if bad_names and any(label in bad_names for label in labels):
            delta -= bad_penalty
        return delta

    @staticmethod
    def _houses_from_strength_factor(
        factor: dict[str, Any], *, factor_id: str
    ) -> frozenset[int]:
        houses_raw = factor.get("houses")
        if not isinstance(houses_raw, list) or not houses_raw:
            raise ValueError(
                f"planet_rules.strength_factors id={factor_id!r} missing houses"
            )
        parsed: set[int] = set()
        for h in houses_raw:
            try:
                n = int(h)
            except (TypeError, ValueError):
                continue
            if 1 <= n <= RASHI_COUNT:
                parsed.add(n)
        if not parsed:
            raise ValueError(
                f"planet_rules.strength_factors id={factor_id!r} invalid houses"
            )
        return frozenset(parsed)

    @staticmethod
    def dusthana_house_flag(
        whole_sign_house: Any, dusthana_houses: frozenset[int]
    ) -> str:
        if isinstance(whole_sign_house, int) and whole_sign_house in dusthana_houses:
            return HOUSE_6_8_12_YES
        return HOUSE_6_8_12_NO

    @staticmethod
    def lagna_lord_enemy_flag(
        friendship: dict[str, Any], planet_key: str, lagna_rashi_index: Any
    ) -> str:
        if not planet_key or not isinstance(lagna_rashi_index, int):
            return HOUSE_6_8_12_NO
        if not (0 <= lagna_rashi_index < RASHI_COUNT):
            return HOUSE_6_8_12_NO
        lagna_lord = RASHI_SIGN_LORD_IN_ENG[lagna_rashi_index]
        relation = EnrichKundali.natural_friendship_with_lord_planet(
            friendship, planet_key, lagna_lord
        )
        if relation == PLANET_RELATION_ENEMY:
            return HOUSE_6_8_12_YES
        return HOUSE_6_8_12_NO

    @staticmethod
    def yes_no_display(flag: Any) -> str:
        return "Yes" if str(flag or "").strip().lower() == HOUSE_6_8_12_YES else "No"

    @staticmethod
    def enemy_cell_color_if_yes(flag: Any) -> str:
        return "enemy" if str(flag or "").strip().lower() == HOUSE_6_8_12_YES else ""

    @staticmethod
    def karakwaqt_cell_color_kind(planet: dict[str, Any]) -> str:
        """Green for yog karak; red for marak / badhak / prabal marak."""
        if (
            str(planet.get("is_planet_karakwaqt_harmful", HOUSE_6_8_12_NO) or "")
            .strip()
            .lower()
            == HOUSE_6_8_12_YES
        ):
            return PLANET_RELATION_ENEMY
        kw = str(planet.get("planet_karakwaqt") or "").lower()
        if "yog karak" in kw:
            return PLANET_RELATION_FRIEND
        return ""

    @staticmethod
    def degree_in_sign_for_death_match(planet: dict[str, Any]) -> float | None:
        phase = planet.get("sign_degree_phase")
        if isinstance(phase, dict):
            deg = phase.get("at_birth_degrees_in_sign")
            if isinstance(deg, (int, float)):
                return float(deg)
        return None

    @staticmethod
    def vedic_degree_number_in_sign(deg_in_sign: float) -> int:
        """1-based degree index within sign (matches Mrityu Bhaga table)."""
        return int(float(deg_in_sign) % ONE_HOUSE_DEGREES) + 1

    @staticmethod
    def death_degree_flag(
        rashi_english: str,
        deg_in_sign: Any,
        rules: list[dict[str, Any]] | None,
    ) -> str:
        if not rules or not isinstance(deg_in_sign, (int, float)):
            return HOUSE_6_8_12_NO
        rashi = remove_white_space(rashi_english).lower()
        deg_n = EnrichKundali.vedic_degree_number_in_sign(float(deg_in_sign))
        for rule in rules:
            sign = remove_white_space(str(rule.get("sign") or "")).lower()
            target = rule.get("degree")
            if sign == rashi and isinstance(target, int) and deg_n == target:
                return HOUSE_6_8_12_YES
        return HOUSE_6_8_12_NO

    def attach_death_degree_flags(self, chart: dict[str, Any]) -> None:
        by_planet = self.load_death_degree_rules()
        for p in chart.get("planets") or []:
            if not isinstance(p, dict):
                continue
            pkey = remove_white_space(p.get("name", ""))
            if pkey == "ascendant":
                deg = p.get("degree_in_rashi")
            else:
                deg = EnrichKundali.degree_in_sign_for_death_match(p)
            p["is_planet_at_death_degree"] = EnrichKundali.death_degree_flag(
                str(p.get("rashi_english") or ""),
                deg,
                by_planet.get(pkey),
            )
            p.pop("is_lagna_at_death_degree", None)
            if p["is_planet_at_death_degree"] == HOUSE_6_8_12_YES:
                planet_rules = chart["planet_rules"]
                if not isinstance(planet_rules, dict):
                    raise ValueError("planet_rules required on chart for death_degree")
                if planet_rules["strength_factor_apply"]["death_degree"]:
                    EnrichKundali.apply_death_degree_strength_override(
                        p, planet_rules
                    )

    @staticmethod
    def apply_death_degree_strength_override(
        planet: dict[str, Any],
        strength_rules: dict[str, Any],
    ) -> None:
        """Mrityu Bhaga hit: force strength to ``death_degree_override_percent``."""
        zero = int(strength_rules["death_degree_override_percent"])
        planet["planet_strength"] = zero
        phase = planet.get("sign_degree_phase")
        if isinstance(phase, dict):
            phase["strength_percent"] = zero
            phase["label"] = f"{zero}%"

    @staticmethod
    def strength_cell_color_kind(
        strength: Any,
        at_death_degree: Any = HOUSE_6_8_12_NO,
        strength_rules: dict[str, Any] | None = None,
    ) -> str:
        """Green above threshold; red at death degree or at/below floor; no tint otherwise."""
        if not isinstance(strength_rules, dict):
            raise ValueError("planet_rules required for strength cell color")
        ui = strength_rules.get("color_intensity")
        if not isinstance(ui, dict):
            raise ValueError("planet_rules.color_intensity required")
        high_above = int(ui["high_green_above_percent"])
        red_floor = int(ui["red_at_or_below_percent"])
        red_on_death = is_yes_no(ui.get("red_if_death_degree"))
        if red_on_death and str(at_death_degree or "").strip().lower() == HOUSE_6_8_12_YES:
            return PLANET_RELATION_ENEMY
        if not isinstance(strength, (int, float)):
            return ""
        if strength > high_above:
            return PLANET_STATUS_HIGH
        if strength <= red_floor:
            return PLANET_RELATION_ENEMY
        return ""

    @staticmethod
    def planet_status_color_kind(status: Any) -> str:
        """UI CSS kind for status cells: high, low, own, friend, enemy, or empty."""
        s = remove_white_space(str(status or "")).lower()
        if s == PLANET_STATUS_HIGH:
            return "high"
        if s == PLANET_STATUS_LOW:
            return "low"
        if s == PLANET_RELATION_OWN:
            return "own"
        if s == PLANET_RELATION_FRIEND:
            return "friend"
        if s == PLANET_RELATION_ENEMY:
            return "enemy"
        return ""

    @staticmethod
    def build_planet_cell_styles(
        planet: dict[str, Any],
        strength_rules: dict[str, Any] | None = None,
    ) -> dict[str, str]:
        """Per-column cell color hints for planets table (computed in Python, used by UI)."""
        malefic = planet.get("is_planet_in_6_8_12_house", HOUSE_6_8_12_NO)
        lagna_enemy = planet.get("is_planet_lagna_lord_enemy", HOUSE_6_8_12_NO)
        rashi_status = (
            planet.get("planet_status_in_rashi")
            or planet.get("planet_relation_with_rashi_lord")
            or ""
        )
        nak_status = (
            planet.get("planet_status_in_nakshatra")
            or planet.get("planet_relation_with_nakshatra_lord")
            or ""
        )
        nav_harmful = planet.get("is_planet_navatara_harmful", HOUSE_6_8_12_NO)
        death_deg = planet.get("is_planet_at_death_degree", HOUSE_6_8_12_NO)
        at_death = str(death_deg or "").strip().lower() == HOUSE_6_8_12_YES
        status_rashi_color = (
            PLANET_RELATION_ENEMY
            if at_death
            else EnrichKundali.planet_status_color_kind(rashi_status)
        )
        status_nak_color = (
            PLANET_RELATION_ENEMY
            if at_death
            else EnrichKundali.planet_status_color_kind(nak_status)
        )
        return {
            "strength": EnrichKundali.strength_cell_color_kind(
                planet.get("planet_strength"), death_deg, strength_rules
            ),
            "is_planet_at_death_degree": EnrichKundali.enemy_cell_color_if_yes(death_deg),
            "is_planet_in_6_8_12_house": EnrichKundali.enemy_cell_color_if_yes(malefic),
            "is_planet_lagna_lord_enemy": EnrichKundali.enemy_cell_color_if_yes(lagna_enemy),
            "planet_status_in_rashi": status_rashi_color,
            "planet_status_in_nakshatra": status_nak_color,
            "navatara": EnrichKundali.enemy_cell_color_if_yes(nav_harmful),
            "karakwaqt": EnrichKundali.karakwaqt_cell_color_kind(planet),
        }

    @staticmethod
    def planet_house_number(planet: dict[str, Any]) -> int | None:
        house = planet.get("house")
        if isinstance(house, dict):
            num = house.get("number")
            if isinstance(num, int):
                return num
        num = planet.get("whole_sign_house")
        return num if isinstance(num, int) else None

    @staticmethod
    def whole_sign_houses_by_number(lagna_idx: int) -> dict[int, dict[str, Any]]:
        """Whole-sign house 1–12 → rashi per house (lagna = house 1)."""
        if not isinstance(lagna_idx, int):
            return {}
        out: dict[int, dict[str, Any]] = {}
        for bh in range(RASHI_COUNT):
            ri = (lagna_idx + bh) % RASHI_COUNT
            out[bh + 1] = {
                "house": bh + 1,
                "rashi_index": ri,
                "rashi_english": RASHI_IN_ENG[ri],
                "rashi_sanskrit": RASHI_IN_SANSKRIT[ri],
            }
        return out

    def attach_house_context_to_planets(self, chart: dict[str, Any]) -> None:
        """Attach ``house`` (number, for, rashi) on each planet (including ascendant)."""
        asc = EnrichKundali.find_ascendant_planet(chart) or {}
        lagna_idx = asc.get("rashi_index") if isinstance(asc, dict) else None
        houses_by_num = EnrichKundali.whole_sign_houses_by_number(lagna_idx)
        if not houses_by_num:
            for row in chart.pop("houses_whole_sign", None) or []:
                if isinstance(row, dict) and isinstance(row.get("house"), int):
                    houses_by_num[row["house"]] = row
        else:
            chart.pop("houses_whole_sign", None)
        house_for = self.load_houses_for_lookup()
        for p in chart.get("planets") or []:
            if not isinstance(p, dict):
                continue
            hn = EnrichKundali.planet_house_number(p)
            if hn is None:
                continue
            ws = houses_by_num.get(hn) or {}
            p["house"] = {
                "number": hn,
                "for": house_for.get(hn) or [],
                "rashi": {
                    "index": ws.get("rashi_index", p.get("rashi_index")),
                    "english": ws.get("rashi_english", p.get("rashi_english")),
                    "sanskrit": ws.get("rashi_sanskrit", p.get("rashi_sanskrit")),
                },
            }
            p.pop("whole_sign_house", None)
        chart.pop("houses_whole_sign", None)

    @staticmethod
    def compact_planets_for_api(chart: dict[str, Any]) -> None:
        """Remove table-only / duplicate fields from ``planets[]`` API payload."""
        drop_keys = (
            "cell_styles",
            "malefic_6_8_12_display",
            "is_planet_lagna_lord_enemy_display",
            "is_planet_at_death_degree_display",
            "planet_relation_with_rashi_lord",
            "planet_relation_with_nakshatra_lord",
            "planet_strength_base",
            "incoming_aspect_strength",
            "is_planet_marak_and_badhak",
            "nakshatra_ruling_planet",
            "whole_sign_house",
        )
        for p in chart.get("planets") or []:
            if not isinstance(p, dict):
                continue
            for key in drop_keys:
                p.pop(key, None)

    @staticmethod
    def compact_kundali_chart_payload(chart: dict[str, Any]) -> dict[str, Any]:
        """``planets`` + ``strength_max`` for inline North Indian chart rendering."""
        strength_max = chart.get("strength_max")
        if not isinstance(strength_max, (int, float)):
            strength_max = 500
        planets_out: list[dict[str, Any]] = []
        for p in chart.get("planets") or []:
            if not isinstance(p, dict):
                continue
            name = remove_white_space(p.get("name", "")).lower()
            if not name:
                continue
            row: dict[str, Any] = {"name": name}
            ri = p.get("rashi_index")
            if isinstance(ri, int):
                row["rashi_index"] = ri
            strength = p.get("planet_strength")
            if isinstance(strength, (int, float)):
                row["planet_strength"] = int(strength)
            status_color = p.get("planet_status_color")
            if status_color:
                row["planet_status_color"] = str(status_color)
            status_rashi = p.get("planet_status_in_rashi") or p.get(
                "planet_relation_with_rashi_lord"
            )
            if status_rashi:
                row["planet_status_in_rashi"] = str(status_rashi)
            house_num = EnrichKundali.planet_house_number(p)
            if isinstance(house_num, int):
                row["whole_sign_house"] = house_num
            phase = p.get("sign_degree_phase")
            if isinstance(phase, dict) and isinstance(
                phase.get("strength_percent"), (int, float)
            ):
                row["sign_degree_phase"] = {
                    "strength_percent": int(phase["strength_percent"]),
                }
            planets_out.append(row)
        return {
            "planets": planets_out,
            "strength_max": int(strength_max),
        }

    def attach_planet_table_ui_metadata(self, chart: dict[str, Any]) -> None:
        """Chart color hint on each planet (table styling lives in ``planets_table``)."""
        for p in chart.get("planets") or []:
            if not isinstance(p, dict):
                continue
            if remove_white_space(p.get("name", "")) == "ascendant":
                continue
            if p.get("is_planet_at_death_degree") == HOUSE_6_8_12_YES:
                p["planet_status_color"] = PLANET_RELATION_ENEMY
            else:
                p["planet_status_color"] = EnrichKundali.planet_status_color_kind(
                    p.get("planet_status_in_rashi")
                    or p.get("planet_relation_with_rashi_lord")
                )

    @staticmethod
    def degree_phase_within_sign(
        deg_in_rashi: float,
        bands: tuple[tuple[float, float, str, int, bool], ...] | None = None,
    ) -> dict[str, Any]:
        d = float(deg_in_rashi) % ONE_HOUSE_DEGREES
        if not bands:
            raise ValueError("planet_rules.degree_in_sign_bands required")
        phase_bands = bands
        lo, hi, phase, pct, apply = phase_bands[-1]
        for band_lo, band_hi, band_phase, band_pct, band_apply in phase_bands:
            if d < band_hi:
                lo, hi, phase, pct, apply = (
                    band_lo,
                    band_hi,
                    band_phase,
                    band_pct,
                    band_apply,
                )
                break
        strength = pct if apply else 100
        return {
            "phase_english": phase,
            "strength_percent": strength,
            "range_low_deg_in_sign": lo,
            "range_high_deg_in_sign": hi,
            "at_birth_degrees_in_sign": round(d, 4),
            "label": f"{strength}%",
        }

    def add_kundali_summary_block(self, chart: dict[str, Any]) -> None:
        asc = EnrichKundali.find_ascendant_planet(chart) or {}
        mn = EnrichKundali.moon_janma_nakshatra(chart)
        pr = chart.get("place_resolved") or {}
        chart["kundali_summary"] = {
            "place_query": chart.get("place_query"),
            "resolved_place": ", ".join(
                str(x) for x in (pr.get("name"), pr.get("admin1"), pr.get("country")) if x
            ),
            "coordinates": {"latitude": pr.get("latitude"), "longitude": pr.get("longitude")},
            "timezone": pr.get("timezone"),
            "datetime_local_iso": chart.get("datetime_local_iso"),
            "datetime_utc_iso": chart.get("datetime_utc_iso"),
            "julian_day_ut": chart.get("julian_day_ut"),
            "ayanamsa_degrees": chart.get("ayanamsa_degrees"),
            "house_system": chart.get("house_system"),
            "ephemeris": chart.get("ephemeris"),
            "lagna": {
                "rashi_english": asc.get("rashi_english"),
                "rashi_sanskrit": asc.get("rashi_sanskrit"),
                "degree_in_rashi": asc.get("degree_in_rashi"),
                "sidereal_longitude": asc.get("sidereal_longitude"),
            },
            "moon_janma": {
                "nakshatra": mn.get("nakshatra"),
                "pada": mn.get("pada"),
                "ruling_planet": mn.get("ruling_planet"),
                "starting_name_letter": mn.get("starting_name_letter"),
            },
        }

    def add_lunar_calendar_to_summary(self, chart: dict[str, Any]) -> None:
        summary = chart.get("kundali_summary")
        if not isinstance(summary, dict):
            return
        elong = self.sun_moon_elongation_degrees(chart)
        if elong is None:
            summary["lunar_calendar"] = None
            return
        tithi_number = min(int(elong // TITHI_DEGREES_PER_TITHI) + 1, TITHI_COUNT)
        tithi_name, paksha = self.tithi_name_and_paksha(tithi_number)
        weekday = self.weekday_from_local_iso(str(chart.get("datetime_local_iso") or ""))
        summary["lunar_calendar"] = {
            "weekday_english": weekday,
            "paksha_english": paksha,
            "tithi_number": tithi_number,
            "tithi_name_english": tithi_name,
            "sun_moon_elongation_degrees": round(elong, 6),
        }

    @staticmethod
    def sun_moon_elongation_degrees(chart: dict[str, Any]) -> float | None:
        sun_lon = moon_lon = None
        for p in chart.get("planets") or []:
            name = str(p.get("name", "")).lower()
            if name == "sun":
                sun_lon = float(p["sidereal_longitude"])
            elif name == "moon":
                moon_lon = float(p["sidereal_longitude"])
        if sun_lon is None or moon_lon is None:
            return None
        return (moon_lon - sun_lon) % FULL_CIRCLE_DEGREES

    @staticmethod
    def tithi_name_and_paksha(tithi_number: int) -> tuple[str, str]:
        if not (1 <= tithi_number <= TITHI_COUNT):
            return UNKNOWN_LABEL, UNKNOWN_LABEL
        paksha = PAKSHA_SHUKLA if tithi_number <= SHUKLA_PAKSHA_MAX_TITHI else PAKSHA_KRISHNA
        if tithi_number == SHUKLA_PAKSHA_MAX_TITHI:
            return TITHI_PURNIMA, paksha
        if tithi_number == TITHI_COUNT:
            return TITHI_AMAVASYA, paksha
        if tithi_number <= 14:
            return TITHI_NAME_1_TO_14[tithi_number - 1], paksha
        return TITHI_NAME_1_TO_14[tithi_number - 16], paksha

    @staticmethod
    def weekday_from_local_iso(iso_s: str) -> str:
        try:
            return calendar.day_name[
                datetime.fromisoformat(iso_s.replace("Z", "+00:00")).weekday()
            ]
        except ValueError:
            return ""

    @staticmethod
    def build_nakshatra_to_navatara_lookup(
        navatara_with_nakshatras: list[dict[str, Any]],
    ) -> dict[str, str]:
        """Map normalized nakshatra name → nava-tara name (janma-rotated wheel)."""
        lookup: dict[str, str] = {}
        for navatara in navatara_with_nakshatras:
            if not isinstance(navatara, dict):
                continue
            nav_name = remove_white_space(str(navatara.get("name") or ""))
            if not nav_name:
                continue
            for item in navatara.get("nakshatras") or []:
                if not isinstance(item, dict):
                    continue
                nk = remove_white_space(str(item.get("nakshatra") or ""))
                if nk:
                    lookup[nk] = nav_name
        return lookup

    @staticmethod
    def moon_birth_pada_number(
        chart: dict[str, Any], mn: dict[str, Any] | None = None
    ) -> int | None:
        """Moon janma pada (1–4) at birth; never the ``data.json`` syllable list."""
        mn = mn if isinstance(mn, dict) else EnrichKundali.moon_janma_nakshatra(chart)
        pada = mn.get("pada")
        if isinstance(pada, int) and 1 <= pada <= PADAS_PER_NAKSHATRA:
            return pada
        try:
            n = int(pada)
            if 1 <= n <= PADAS_PER_NAKSHATRA:
                return n
        except (TypeError, ValueError):
            pass
        for p in chart.get("planets") or []:
            if not isinstance(p, dict) or p.get("name") != "moon":
                continue
            pp = p.get("nakshatra_pada")
            if isinstance(pp, int) and 1 <= pp <= PADAS_PER_NAKSHATRA:
                return pp
            lon = p.get("sidereal_longitude")
            if isinstance(lon, (int, float)):
                _, pp = KundaliBuilder.longitude_to_nakshatra_pada(float(lon))
                return pp
        return None

    def normalize_moon_nakshatra(self, chart: dict[str, Any]) -> None:
        """Birth pada as integer + ``starting_name_letter`` on Moon ``janma_nakshatra``."""
        moon = EnrichKundali.find_moon_planet(chart)
        if not moon:
            raise ValueError("Moon planet required")
        mn = moon.get("janma_nakshatra")
        if not isinstance(mn, dict):
            raise ValueError("Moon janma_nakshatra required")
        chart.pop("moon_nakshatra", None)
        syllables = mn.get("pada") if isinstance(mn.get("pada"), list) else None
        mn.pop("nakshatra_pada_syllables", None)
        birth_pada = self.moon_birth_pada_number(chart, mn)
        if birth_pada is not None:
            mn["pada"] = birth_pada
        if not syllables:
            nk_name = remove_white_space(str(mn.get("nakshatra") or ""))
            if nk_name:
                for nak in self.load_nakshatra_list_from_database():
                    if remove_white_space(str(nak.get("nakshatra") or "")) == nk_name:
                        syllables = nak.get("pada")
                        break
        if not str(mn.get("starting_name_letter") or "").strip() and birth_pada:
            letter = KundaliBuilder.starting_name_letter_for_pada(
                {"pada": syllables}, birth_pada
            )
            if letter:
                mn["starting_name_letter"] = letter

    def attach_planet_navatara_from_janma(self, chart: dict[str, Any]) -> None:
        """Set ``planet_navatara`` on each planet from Moon janma nava-tara wheel."""
        mn = EnrichKundali.moon_janma_nakshatra(chart)
        janma = str(mn.get("nakshatra") or "").strip()
        if not janma:
            raise ValueError("Moon janma_nakshatra.nakshatra required")
        data = self.load_planet_database()
        payload = NavataraFinder(data).build_navatara_payload_for_janma_nakshatra(janma)
        lookup = self.build_nakshatra_to_navatara_lookup(
            payload["navatara_with_nakshatras"]
        )
        harmful = EnrichKundali.harmful_navatara_names(payload["navatara_definitions"])
        for p in chart.get("planets") or []:
            if not isinstance(p, dict):
                continue
            if remove_white_space(p.get("name", "")) == "ascendant":
                continue
            nk = remove_white_space(str(p.get("nakshatra") or ""))
            nav = lookup.get(nk, "")
            p["planet_navatara"] = nav
            p["is_planet_navatara_harmful"] = (
                HOUSE_6_8_12_YES
                if remove_white_space(nav) in harmful
                else HOUSE_6_8_12_NO
            )

    def attach_nakshatras_for_moon_janma(self, chart: dict[str, Any]) -> None:
        """Attach flat ``nakshatras`` (27 rows) and optional ``dusthana_filter`` metadata."""
        janma = str(EnrichKundali.moon_janma_nakshatra(chart).get("nakshatra") or "").strip()
        if not janma:
            raise ValueError("Moon janma_nakshatra.nakshatra required")
        built = self.build_nakshatras_for_janma(janma, chart.get("planets"))
        chart["nakshatras"] = built["nakshatras"]
        chart["dusthana_filter"] = built.get("dusthana_filter")

    def build_nakshatras_for_janma(
        self,
        janma_nakshatra: str,
        planets: list[dict[str, Any]] | None = None,
    ) -> dict[str, Any]:
        """Moon janma wheel: ``nakshatras`` table rows + dusthana filter metadata (no nested navatara blob)."""
        data = self.load_planet_database()
        finder = NavataraFinder(data)
        raw = finder.build_navatara_payload_for_janma_nakshatra(janma_nakshatra)

        removed: list[dict[str, Any]] = []
        dusthana_keys: set[str] = set()
        if planets:
            dusthana_keys = self.collect_dusthana_planet_keys_from_birth_chart(planets)
            raw, removed = self.filter_helpful_navatara_rows_by_dusthana_planets(raw, dusthana_keys)

        dusthana_filter: dict[str, Any] | None = None
        if planets is not None:
            dusthana_filter = {
                "planets_in_dusthana_by_name": sorted(dusthana_keys),
                "removed_count": len(removed),
                "removed": removed,
            }

        return {
            "input_nakshatra": raw.get("input_nakshatra"),
            "nakshatras": self.build_nakshatra_table_rows(raw),
            "dusthana_filter": dusthana_filter,
        }

    def build_filtered_navatara_payload_for_janma(
        self,
        janma_nakshatra: str,
        planets: list[dict[str, Any]] | None = None,
    ) -> dict[str, Any]:
        """Legacy alias for ``build_nakshatras_for_janma`` (CLI / older imports)."""
        return self.build_nakshatras_for_janma(janma_nakshatra, planets)

    @staticmethod
    def collect_dusthana_planet_keys_from_birth_chart(
        planets: list[dict[str, Any]],
    ) -> set[str]:
        keys: set[str] = set()
        for p in planets:
            if not isinstance(p, dict):
                continue
            flag = str(p.get("is_planet_in_6_8_12_house", "")).strip().lower()
            if flag == HOUSE_6_8_12_YES:
                keys.add(remove_white_space(p.get("name")))
                continue
            if flag == HOUSE_6_8_12_NO:
                continue
            h = EnrichKundali.planet_house_number(p)
            if isinstance(h, int) and h in HOUSE_6_8_12:
                keys.add(remove_white_space(p.get("name")))
        return keys

    @staticmethod
    def navatara_row_is_marked_auspicious(navatara: dict[str, Any]) -> bool:
        return EnrichKundali.navatara_is_auspicious(navatara)

    def filter_helpful_navatara_rows_by_dusthana_planets(
        self,
        navatara_payload: dict[str, Any],
        dusthana_planet_keys: set[str],
    ) -> tuple[dict[str, Any], list[dict[str, Any]]]:
        out = copy.deepcopy(navatara_payload)
        removed: list[dict[str, Any]] = []
        for navatara in out.get("navatara_with_nakshatras") or []:
            if not isinstance(navatara, dict) or not self.navatara_row_is_marked_auspicious(navatara):
                continue
            kept = []
            for item in navatara.get("nakshatras") or []:
                if not isinstance(item, dict):
                    kept.append(item)
                    continue
                rp = remove_white_space(item.get("ruling_planet"))
                if rp and rp in dusthana_planet_keys:
                    removed.append(
                        {
                            "navatara_name": navatara.get("name"),
                            "nakshatra": item.get("nakshatra"),
                            "ruling_planet": item.get("ruling_planet"),
                        }
                    )
                else:
                    kept.append(item)
            navatara["nakshatras"] = kept
        return out, removed

    @staticmethod
    def _nakshatra_item_from_source(source: dict[str, Any], position: int) -> dict[str, Any]:
        item: dict[str, Any] = {"position_from_input": position}
        for key in (
            "nakshatra",
            "ruling_planet",
            "deity",
            "symbol",
            "tree",
            "directions",
            "lunar_month",
            "tithi",
            "remedy",
            "mantra",
            "animal",
            "lucky_colors",
            "lucky_number",
            "lucky_day",
            "lucky_time",
        ):
            if key in source:
                item[key] = source[key]
        return item

    @staticmethod
    def navatara_meta_for_position(
        navatara_definitions: list[dict[str, Any]], position: int
    ) -> dict[str, Any]:
        for nav in navatara_definitions:
            if not isinstance(nav, dict):
                continue
            if position in (nav.get("sequences") or []):
                return nav
        return {}

    @staticmethod
    def _format_lucky_colors_field(colors: Any) -> str:
        if isinstance(colors, list):
            return ", ".join(str(c).strip() for c in colors if str(c).strip())
        return str(colors or "").strip()

    @staticmethod
    def build_nakshatra_table_rows(
        navatara_payload: dict[str, Any],
    ) -> list[dict[str, Any]]:
        """One row per nakshatra (27): wheel order from Moon janma, with nava-tara metadata."""
        ordered = navatara_payload.get("ordered_nakshatras")
        if not isinstance(ordered, list) or not ordered:
            raise ValueError("ordered_nakshatras required in navatara payload")
        definitions = navatara_payload.get("navatara_definitions")
        if not isinstance(definitions, list) or not definitions:
            raise ValueError("navatara_definitions required in navatara payload")
        rows: list[dict[str, Any]] = []
        for position, source in enumerate(ordered, start=1):
            if not isinstance(source, dict):
                continue
            nav = EnrichKundali.navatara_meta_for_position(definitions, position)
            src_list = [source]
            rows.append(
                {
                    "position": position,
                    "auspicious": nav.get("auspicious") or "",
                    "nakshatra": source.get("nakshatra") or "",
                    "navatara": nav.get("name") or "",
                    "about": nav.get("result") or "",
                    "symbol": source.get("symbol") or "",
                    "ruling_planet": source.get("ruling_planet") or "",
                    "deity": source.get("deity") or "",
                    "tree": source.get("tree") or "",
                    "directions": source.get("directions") or "",
                    "lunar_month": source.get("lunar_month") or "",
                    "tithi": source.get("tithi") or "",
                    "remedy": source.get("remedy") or "",
                    "mantra": source.get("mantra") or "",
                    "animal": source.get("animal") or "",
                    "lucky_colors": EnrichKundali._format_lucky_colors_field(
                        source.get("lucky_colors")
                    ),
                    "lucky_number": EnrichKundali._join_lucky_numbers(src_list),
                    "lucky_day": EnrichKundali._join_lucky_days(src_list),
                    "lucky_time": EnrichKundali._join_lucky_times(src_list),
                }
            )
        return rows

    @staticmethod
    def build_navatara_table_rows(navatara_payload: dict[str, Any]) -> list[dict[str, Any]]:
        """Legacy alias for ``build_nakshatra_table_rows``."""
        return EnrichKundali.build_nakshatra_table_rows(navatara_payload)

    @staticmethod
    def format_house_for_display(for_items: list[str]) -> str:
        return ", ".join(str(x).strip() for x in for_items if str(x).strip())

    @staticmethod
    def planet_degree_in_sign_display(planet: dict[str, Any]) -> str:
        phase = planet.get("sign_degree_phase")
        if isinstance(phase, dict):
            deg = phase.get("at_birth_degrees_in_sign")
            if isinstance(deg, (int, float)):
                return f"{float(deg):.2f}°"
        return UNKNOWN_LABEL

    @staticmethod
    def format_planet_nakshatra_display(nakshatra: str, pada: Any) -> str:
        name = str(nakshatra or "").strip()
        if not name:
            return UNKNOWN_LABEL
        if isinstance(pada, int) and 1 <= pada <= PADAS_PER_NAKSHATRA:
            return f"{name} (pada {pada})"
        return name

    @staticmethod
    def format_dasha_age_display(age: Any) -> str:
        """Compact mahadasha age range for UI, e.g. ``1-5``."""
        if not isinstance(age, dict):
            return ""
        try:
            from_y = float(age.get("from_years"))
            to_y = float(age.get("to_years"))
        except (TypeError, ValueError):
            return ""
        start = int(round(from_y))
        end = int(round(to_y))
        if end < start:
            end = start
        return f"{start}-{end}"

    @staticmethod
    def dasha_age_start_years(row: dict[str, Any]) -> float:
        """Sort key: start of ``dasha_age`` range (e.g. ``48-54`` → 48)."""
        text = str(row.get("dasha_age") or "").strip()
        if text and "-" in text:
            try:
                return float(text.split("-", 1)[0])
            except ValueError:
                pass
        age = row.get("age")
        if isinstance(age, dict):
            try:
                return float(age.get("from_years"))
            except (TypeError, ValueError):
                pass
        return 999.0

    def build_planets_table_rows(self, chart: dict[str, Any]) -> list[dict[str, Any]]:
        """One or more rows per house 1–12; empty houses get a house-only row."""
        strength_rules = chart.get("planet_rules")
        if not isinstance(strength_rules, dict):
            raise ValueError("planet_rules required on chart")
        house_rules = chart.get("house_rules")
        if not isinstance(house_rules, dict):
            raise ValueError("house_rules required on chart")
        hs_base = int(house_rules["base_percent"])
        hs_min = int(house_rules["min_percent"])
        hs_max = int(house_rules["max_percent"])
        friendship = self.load_planet_friendship_lookup_table()
        offsets_by_planet = self.load_planet_aspect_offsets_by_planet()

        def clamp_house_strength_pct(pct: int) -> int:
            if house_rules["apply_strength_limits"]:
                return max(hs_min, min(hs_max, pct))
            return pct

        asc = EnrichKundali.find_ascendant_planet(chart) or {}
        lagna_idx = asc.get("rashi_index") if isinstance(asc, dict) else None
        houses_by_num = EnrichKundali.whole_sign_houses_by_number(lagna_idx)
        house_for = self.load_houses_for_lookup()
        aspectors_by_house = EnrichKundali.aspectors_by_house_from_chart(chart)

        rows_by_house: dict[int, list[dict[str, Any]]] = {hn: [] for hn in range(1, RASHI_COUNT + 1)}

        for p in chart.get("planets") or []:
            if not isinstance(p, dict):
                continue
            if remove_white_space(p.get("name", "")) == "ascendant":
                continue
            house_num = EnrichKundali.planet_house_number(p)
            if not isinstance(house_num, int) or not (1 <= house_num <= RASHI_COUNT):
                continue
            strength = p.get("planet_strength")
            house = p.get("house") if isinstance(p.get("house"), dict) else {}
            for_list = house.get("for") or []
            malefic = p.get("is_planet_in_6_8_12_house", HOUSE_6_8_12_NO)
            lagna_enemy = p.get("is_planet_lagna_lord_enemy", HOUSE_6_8_12_NO)
            death_deg = p.get("is_planet_at_death_degree", HOUSE_6_8_12_NO)
            rashi_status = p.get("planet_status_in_rashi") or UNKNOWN_LABEL
            nak_status = p.get("planet_status_in_nakshatra") or UNKNOWN_LABEL
            hr = house.get("rashi") if isinstance(house.get("rashi"), dict) else {}
            aspectors = p.get("aspected_by") if isinstance(p.get("aspected_by"), list) else []
            hs_delta = EnrichKundali.empty_house_strength_delta_from_aspects(
                house_num,
                chart,
                houses_by_num,
                friendship,
                house_rules,
                offsets_by_planet,
            )
            hs_pct = clamp_house_strength_pct(hs_base + hs_delta)
            planet_pct = strength if isinstance(strength, (int, float)) else None
            total_pct = EnrichKundali.total_strength_percent(hs_pct, planet_pct)
            rows_by_house[house_num].append({
                "house": {
                    "number": house_num,
                    "for": EnrichKundali.format_house_for_display(
                        for_list if isinstance(for_list, list) else house_for.get(house_num, [])
                    ),
                },
                "planet": p.get("name"),
                "aspected_by_planets": list(aspectors),
                "aspected_by": EnrichKundali.format_planet_names_csv(aspectors),
                "degree": EnrichKundali.planet_degree_in_sign_display(p),
                "strength": f"{strength}%" if strength is not None else UNKNOWN_LABEL,
                "strength_percent": strength if isinstance(strength, (int, float)) else None,
                "house_strength": f"{hs_pct}%",
                "house_strength_percent": hs_pct,
                "total_strength": f"{total_pct}%",
                "total_strength_percent": total_pct,
                "flags": {
                    "malefic_6_8_12": EnrichKundali.yes_no_display(malefic),
                    "lagna_lord_enemy": EnrichKundali.yes_no_display(lagna_enemy),
                    "death_degree": EnrichKundali.yes_no_display(death_deg),
                },
                "status": {
                    "rashi": rashi_status,
                    "nakshatra": nak_status,
                },
                "rashi": EnrichKundali._rashi_display(
                    str(hr.get("english") or p.get("rashi_english") or ""),
                    str(hr.get("sanskrit") or p.get("rashi_sanskrit") or ""),
                ),
                "nakshatra": EnrichKundali.format_planet_nakshatra_display(
                    str(p.get("nakshatra") or ""),
                    p.get("nakshatra_pada"),
                ),
                "navatara": p.get("planet_navatara") or "",
                "karakwaqt": p.get("planet_karakwaqt") or "",
                "dasha_age": EnrichKundali.format_dasha_age_display(p.get("age")),
                "cell_styles": EnrichKundali.build_planet_cell_styles(p, strength_rules),
            })

        rows: list[dict[str, Any]] = []
        for house_num in range(1, RASHI_COUNT + 1):
            if rows_by_house[house_num]:
                rows.extend(rows_by_house[house_num])
                continue
            ws = houses_by_num.get(house_num) or {}
            aspectors = aspectors_by_house.get(house_num, [])
            empty_hs_delta = EnrichKundali.empty_house_strength_delta_from_aspects(
                house_num,
                chart,
                houses_by_num,
                friendship,
                house_rules,
                offsets_by_planet,
            )
            empty_hs = clamp_house_strength_pct(hs_base + empty_hs_delta)
            empty_total = EnrichKundali.total_strength_percent(empty_hs, None)
            rows.append({
                "house": {
                    "number": house_num,
                    "for": EnrichKundali.format_house_for_display(house_for.get(house_num, [])),
                },
                "planet": "",
                "aspected_by_planets": list(aspectors),
                "aspected_by": EnrichKundali.format_planet_names_csv(aspectors),
                "degree": "",
                "strength": "",
                "strength_percent": None,
                "house_strength": f"{empty_hs}%",
                "house_strength_percent": empty_hs,
                "total_strength": f"{empty_total}%",
                "total_strength_percent": empty_total,
                "flags": {
                    "malefic_6_8_12": "",
                    "lagna_lord_enemy": "",
                    "death_degree": "",
                },
                "status": {"rashi": "", "nakshatra": ""},
                "rashi": EnrichKundali._rashi_display(
                    str(ws.get("rashi_english") or ""),
                    str(ws.get("rashi_sanskrit") or ""),
                ),
                "nakshatra": "",
                "navatara": "",
                "karakwaqt": "",
                "dasha_age": "",
                "cell_styles": {},
                "empty_house": HOUSE_6_8_12_YES,
            })

        return sorted(
            rows,
            key=lambda r: (
                EnrichKundali.dasha_age_start_years(r),
                int((r.get("house") or {}).get("number") or 99),
                remove_white_space(str(r.get("planet") or "")),
            ),
        )

    @staticmethod
    def planet_strength_by_name_from_chart(chart: dict[str, Any]) -> dict[str, int | None]:
        """Graha name (lower) → ``planet_strength`` for sign-lord lookup."""
        out: dict[str, int | None] = {}
        for p in chart.get("planets") or []:
            if not isinstance(p, dict):
                continue
            key = remove_white_space(p.get("name", "")).lower()
            if not key or key == "ascendant":
                continue
            strength = p.get("planet_strength")
            if isinstance(strength, (int, float)):
                out[key] = int(round(strength))
            else:
                out[key] = None
        return out

    @staticmethod
    def house_lord_payload(
        house_num: int,
        houses_by_num: dict[int, dict[str, Any]],
        strength_by_planet: dict[str, int | None],
    ) -> dict[str, Any]:
        """Sign lord of the house rashi and that graha's planet strength in this chart."""
        ws = houses_by_num.get(house_num) or {}
        ri = ws.get("rashi_index")
        lord_name = ""
        if isinstance(ri, int) and 0 <= ri < RASHI_COUNT:
            lord_name = RASHI_SIGN_LORD_IN_ENG[ri]
        strength = strength_by_planet.get(lord_name) if lord_name else None
        return {"name": lord_name, "strength_percent": strength}

    def build_houses_table_rows(self, chart: dict[str, Any]) -> list[dict[str, Any]]:
        """House-wise values for UI: one row per house (1–12) with precomputed strength + lord."""
        planets_table_rows = chart.get("planets_table") or []
        asc = EnrichKundali.find_ascendant_planet(chart) or {}
        lagna_idx = asc.get("rashi_index") if isinstance(asc, dict) else None
        houses_by_num = EnrichKundali.whole_sign_houses_by_number(lagna_idx)
        strength_by_planet = EnrichKundali.planet_strength_by_name_from_chart(chart)

        by_house: dict[int, dict[str, Any]] = {}
        for row in planets_table_rows:
            if not isinstance(row, dict):
                continue
            house = row.get("house") if isinstance(row.get("house"), dict) else {}
            try:
                house_num = int(house.get("number"))
            except (TypeError, ValueError):
                continue
            if not (1 <= house_num <= RASHI_COUNT):
                continue
            if house_num in by_house:
                continue
            hs_pct = row.get("house_strength_percent")
            hs_txt = row.get("house_strength")
            lord = EnrichKundali.house_lord_payload(
                house_num, houses_by_num, strength_by_planet
            )
            lord_pct = lord.get("strength_percent") if isinstance(lord, dict) else None
            house_pct = hs_pct if isinstance(hs_pct, (int, float)) else None
            total_pct = EnrichKundali.total_strength_percent(house_pct, lord_pct)
            by_house[house_num] = {
                "number": house_num,
                "for": house.get("for") or "",
                "strength_percent": house_pct,
                "strength": str(hs_txt or "").strip() if hs_txt else "",
                "lord": lord,
                "total_strength_percent": total_pct,
            }
        out: list[dict[str, Any]] = []
        for hn in range(1, RASHI_COUNT + 1):
            if hn in by_house:
                out.append(by_house[hn])
                continue
            lord = EnrichKundali.house_lord_payload(hn, houses_by_num, strength_by_planet)
            lord_pct = lord.get("strength_percent") if isinstance(lord, dict) else None
            row = {
                "number": hn,
                "for": "",
                "strength_percent": None,
                "strength": "",
                "lord": lord,
                "total_strength_percent": EnrichKundali.total_strength_percent(None, lord_pct),
            }
            out.append(row)
        return out

    @staticmethod
    def houses_strength_total(houses_rows: list[dict[str, Any]]) -> int:
        """Sum of ``total_strength_percent`` (house + sign-lord) for all 12 bhavas."""
        total = 0
        for row in houses_rows or []:
            if not isinstance(row, dict):
                continue
            pct = row.get("total_strength_percent")
            if isinstance(pct, (int, float)):
                total += int(round(pct))
                continue
            house_pct = row.get("strength_percent")
            lord = row.get("lord")
            lord_pct = lord.get("strength_percent") if isinstance(lord, dict) else None
            total += EnrichKundali.total_strength_percent(house_pct, lord_pct)
        return total

    @staticmethod
    def _title_rashi_name(rashi_english: str) -> str:
        name = str(rashi_english or "").strip()
        return name.title() if name else UNKNOWN_LABEL

    @staticmethod
    def _rashi_display(english: str, sanskrit: str) -> str:
        en = EnrichKundali._title_rashi_name(english)
        sa = str(sanskrit or "").strip().title()
        if en == UNKNOWN_LABEL:
            return UNKNOWN_LABEL
        return f"{en} ({sa})" if sa else en

    @staticmethod
    def _dedupe_comma_list(items: list[str]) -> str:
        parts = [str(p).strip() for p in items if str(p).strip()]
        if not parts:
            return ""
        if len({p.lower() for p in parts}) == 1:
            return parts[0]
        return ", ".join(parts)

    @staticmethod
    def _dedupe_preserve_order(parts: list[str]) -> list[str]:
        seen: set[str] = set()
        out: list[str] = []
        for part in parts:
            key = part.lower()
            if key in seen:
                continue
            seen.add(key)
            out.append(part)
        return out

    @staticmethod
    def _join_lucky_numbers(items: list[dict[str, Any]]) -> str:
        nums: list[str] = []
        for item in items:
            raw = item.get("lucky_number") or []
            if isinstance(raw, list):
                nums.extend(str(n) for n in raw)
            elif raw:
                nums.append(str(raw))
        return ", ".join(EnrichKundali._dedupe_preserve_order(nums))

    @staticmethod
    def _join_lucky_days(items: list[dict[str, Any]]) -> str:
        days: list[str] = []
        for item in items:
            raw = item.get("lucky_day") or []
            if isinstance(raw, list):
                days.extend(str(d).strip() for d in raw if str(d).strip())
            elif raw:
                days.append(str(raw).strip())
        return ", ".join(EnrichKundali._dedupe_preserve_order(days))

    @staticmethod
    def _join_lucky_times(items: list[dict[str, Any]]) -> str:
        times = [
            str(item.get("lucky_time") or "").strip()
            for item in items
            if str(item.get("lucky_time") or "").strip()
        ]
        return " / ".join(EnrichKundali._dedupe_preserve_order(times))

    @staticmethod
    def _format_user_local_time(iso_local: str) -> str:
        raw = str(iso_local or "").strip()
        if not raw:
            return ""
        try:
            dt = datetime.fromisoformat(raw.replace("Z", "+00:00"))
            return dt.strftime("%Y-%m-%d %H:%M:%S")
        except ValueError:
            match = re.match(r"^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}(?::\d{2})?)", raw)
            if match:
                return f"{match.group(1)} {match.group(2)}"
            return raw.replace("T", " ").split("+")[0].strip()

    @staticmethod
    def _ordinal(n: int) -> str:
        n = int(n)
        if 11 <= (n % 100) <= 13:
            return f"{n}th"
        suffix = {1: "st", 2: "nd", 3: "rd"}.get(n % 10, "th")
        return f"{n}{suffix}"

    @staticmethod
    def _tithi_number_in_paksha(tithi_number: int) -> int:
        if tithi_number <= SHUKLA_PAKSHA_MAX_TITHI:
            return tithi_number
        return tithi_number - SHUKLA_PAKSHA_MAX_TITHI

    @staticmethod
    def _moon_tithi_display(lunar: dict[str, Any]) -> str:
        name = str(lunar.get("tithi_name_english") or "").strip()
        tithi_number = lunar.get("tithi_number")
        if not name:
            return UNKNOWN_LABEL
        if not isinstance(tithi_number, int):
            return name
        paksha_tithi = EnrichKundali._tithi_number_in_paksha(tithi_number)
        return f"{name} ({EnrichKundali._ordinal(paksha_tithi)})"

    @staticmethod
    def _moon_type_display(paksha_english: str) -> str:
        key = str(paksha_english or "").strip().lower()
        if key == PAKSHA_KRISHNA.lower():
            return f"{PAKSHA_KRISHNA} paksha (dark moon)"
        if key in ("shukla", "sukla"):
            return f"{PAKSHA_SHUKLA} paksha (white moon)"
        raw = str(paksha_english or "").strip()
        return raw or UNKNOWN_LABEL

    @staticmethod
    def build_summary_table_rows(chart: dict[str, Any]) -> list[dict[str, str]]:
        rows: list[dict[str, str]] = []
        local = str(chart.get("datetime_local_iso") or "").strip()
        if local:
            rows.append({"label": "Time", "value": EnrichKundali._format_user_local_time(local)})
        mn = EnrichKundali.moon_janma_nakshatra(chart)
        nak = str(mn.get("nakshatra") or "").strip()
        birth_pada = EnrichKundali.moon_birth_pada_number(chart, mn)
        if nak:
            pada_part = f" · Pada {birth_pada}" if birth_pada else ""
            rows.append({
                "label": "Janma Nakshatra",
                "value": (
                    f"{nak.title()}{pada_part} · "
                    f"{str(mn.get('ruling_planet', '')).strip().title()}"
                ),
            })
        starting_letter = str(mn.get("starting_name_letter") or "").strip()
        if starting_letter:
            rows.append({
                "label": "Starting name letter",
                "value": starting_letter,
            })
        for p in chart.get("planets") or []:
            if isinstance(p, dict) and p.get("name") == "moon":
                moon_rashi = EnrichKundali._rashi_display(
                    str(p.get("rashi_english") or ""),
                    str(p.get("rashi_sanskrit") or ""),
                )
                if moon_rashi != UNKNOWN_LABEL:
                    rows.append({"label": "Name Rashi", "value": moon_rashi})
                break
        asc = EnrichKundali.find_ascendant_planet(chart) or {}
        lagna_rashi = EnrichKundali._rashi_display(
            str(asc.get("rashi_english") or ""),
            str(asc.get("rashi_sanskrit") or ""),
        )
        if lagna_rashi != UNKNOWN_LABEL:
            rows.append({"label": "Lagna Rashi", "value": lagna_rashi})
        lunar = (chart.get("kundali_summary") or {}).get("lunar_calendar") or {}
        if lunar.get("weekday_english"):
            rows.append({"label": "Weekday", "value": str(lunar["weekday_english"])})
        if lunar.get("paksha_english"):
            rows.append({
                "label": "Moon Type",
                "value": EnrichKundali._moon_type_display(str(lunar["paksha_english"])),
            })
        if lunar.get("tithi_name_english"):
            rows.append({"label": "Moon Tithi", "value": EnrichKundali._moon_tithi_display(lunar)})
        strength_rules = chart.get("planet_rules")
        if not isinstance(strength_rules, dict):
            raise ValueError("planet_rules required on chart")
        sun_longitude = None
        for p in chart.get("planets") or []:
            if isinstance(p, dict) and remove_white_space(p.get("name", "")) == "sun":
                lon = p.get("sidereal_longitude")
                if isinstance(lon, (int, float)):
                    sun_longitude = float(lon)
                break
        combust = [
            str(p.get("name") or "").strip().title()
            for p in chart.get("planets") or []
            if isinstance(p, dict)
            and EnrichKundali.is_planet_combust(
                str(p.get("name") or ""),
                p.get("sidereal_longitude"),
                sun_longitude,
                strength_rules,
            )
        ]
        rows.append({"label": "Combust Planet", "value": ", ".join(combust) if combust else "None"})
        exalted = [
            str(p.get("name") or "").strip().title()
            for p in chart.get("planets") or []
            if isinstance(p, dict) and str(p.get("planet_dignity") or "").strip().lower() == PLANET_DIGNITY_EXALTED
        ]
        rows.append({"label": "Exalted Planet", "value": ", ".join(exalted) if exalted else "None"})
        debilitated = [
            str(p.get("name") or "").strip().title()
            for p in chart.get("planets") or []
            if isinstance(p, dict) and str(p.get("planet_dignity") or "").strip().lower() == PLANET_DIGNITY_DEBILITATED
        ]
        rows.append({"label": "Debilitated Planet", "value": ", ".join(debilitated) if debilitated else "None"})
        retrograde = [
            str(p.get("name") or "").strip().title()
            for p in chart.get("planets") or []
            if isinstance(p, dict) and is_yes_no(p.get("retrograde"))
        ]
        rows.append({"label": "Retrograde Planet", "value": ", ".join(retrograde) if retrograde else "None"})
        houses_total = chart.get("houses_strength_total")
        if isinstance(houses_total, (int, float)):
            rows.append({
                "label": "Houses strength",
                "value": str(int(round(houses_total))),
            })
        return rows

    @staticmethod
    def build_ui_status_message(chart: dict[str, Any]) -> str:
        return KUNDALI_READY_STATUS_MESSAGE


# --- module API (Flask, scripts) ---

def build_kundali_chart(
    root: Path,
    date_str: str,
    time_str: str,
    place_query: str,
    house_system: str = DEFAULT_HOUSE_SYSTEM,
) -> dict[str, Any]:
    """Build full kundali in memory (no ``output/`` JSON dump)."""
    return KundaliBuilder(root).build_full_report(date_str, time_str, place_query, house_system)


def build_full_kundali(
    root: Path,
    date_str: str,
    time_str: str,
    place_query: str,
    house_system: str = DEFAULT_HOUSE_SYSTEM,
) -> dict[str, Any]:
    """Build chart + UI tables in memory (no ``output/`` write)."""
    return KundaliBuilder(root).build_full_report(date_str, time_str, place_query, house_system)


def build_navatara(
    root: Path,
    janma_nakshatra: str,
    planets: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    """Standalone nakshatra wheel build (CLI / legacy imports)."""
    return EnrichKundali(root).build_nakshatras_for_janma(janma_nakshatra, planets)


def build_nakshatras(
    root: Path,
    janma_nakshatra: str,
    planets: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    """Standalone nakshatra wheel build."""
    return EnrichKundali(root).build_nakshatras_for_janma(janma_nakshatra, planets)

def create_dumps_kundali_chart(
    root: Path,
    date_str: str,
    time_str: str,
    place_query: str,
    house_system: str = DEFAULT_HOUSE_SYSTEM,
) -> dict[str, Any]:
    """Module-level entry: same as ``build_full_kundali``."""
    return build_full_kundali(root, date_str, time_str, place_query, house_system)


# Legacy aliases for older imports
birth_output_filename = KundaliBuilder.birth_output_filename
geocode_open_meteo = KundaliBuilder.geocode_place_name
parse_local_datetime = KundaliBuilder.parse_birth_datetime_local
lon_to_rashi = KundaliBuilder.longitude_to_rashi
lon_to_nakshatra_pada = KundaliBuilder.longitude_to_nakshatra_pada


def main() -> None:
    root = Path(__file__).resolve().parent.parent
    ap = argparse.ArgumentParser(description="Sidereal (Lahiri) kundali from date, time, and place.")
    ap.add_argument("--date", required=True)
    ap.add_argument("--time", required=True)
    ap.add_argument("--place", required=True)
    ap.add_argument("--house-system", default=DEFAULT_HOUSE_SYSTEM, choices=VALID_HOUSE_SYSTEMS)
    ap.add_argument("-o", "--output", type=Path)
    args = ap.parse_args()

    builder = KundaliBuilder(root)
    report = builder.create_dumps_kundali_chart(
        args.date, args.time, args.place, args.house_system
    )
    dump_path = root / OUTPUT_DIR_REL_PATH / builder.birth_output_filename(
        args.date, args.time, args.place
    )
    print(f"[kundali] wrote JSON: {dump_path}", file=sys.stderr)
    builder.print_debug_tables(report)

    text = json.dumps(json_stringify_yes_no_values(report), indent=2, ensure_ascii=False)
    if args.output:
        builder.write_report_to_file(report, args.output)
        print(f"wrote {args.output}", file=sys.stderr)
    else:
        print(text)


if __name__ == "__main__":
    main()
