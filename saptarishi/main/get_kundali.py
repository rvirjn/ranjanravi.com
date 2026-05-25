"""
Sidereal birth chart (kundali) from civil date, time, and place name.

CLI: ``python main/get_kundali.py --date YYYY-MM-DD --time HH:MM --place "City, Country"``

Flask/UI: ``build_full_kundali(root, date, time, place)`` → one JSON with chart, navatara, UI tables.
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

from constant import (
    AUSPICIOUS_NAVATARA_VALUES,
    HARMFUL_NAVATARA_NAMES,
    AYANAMSA_NAME,
    DEFAULT_GRAHA_BODIES,
    DEFAULT_HOUSE_SYSTEM,
    DEGREES_180,
    EPHEMERIS_DIR_REL_PATH,
    FULL_CIRCLE_DEGREES,
    HOUSE_6_8_12,
    HOUSE_6_8_12_NO,
    HOUSE_6_8_12_YES,
    ONE_HOUSE_DEGREES,
    ONE_NAKSHATRA_DEGREES,
    PLANET_RELATION_ENEMY,
    PLANET_RELATION_FRIEND,
    PLANET_RELATION_NEUTRAL,
    PLANET_RELATION_OWN,
    PLANET_STATUS_HIGH,
    PLANET_STATUS_LOW,
    DEBILITATED_STRENGTH_PENALTY,
    EXALTED_STRENGTH_BONUS,
    PLANET_DIGNITY_DEBILITATED,
    PLANET_DIGNITY_EXALTED,
    PLANET_STRENGTH_MAX_PERCENT,
    PLANET_STRENGTH_MIN_PERCENT,
    STRENGTH_HIGH_GREEN_THRESHOLD_PERCENT,
    PLANET_STRENGTH_DEATH_DEGREE_PERCENT,
    GEOCODE_ALTERNATIVE_COUNT,
    GEOCODE_API_SEARCH_URL,
    GEOCODE_RESULT_COUNT,
    GEOCODE_TIMEOUT_SECONDS,
    GEOCODE_USER_AGENT,
    NAKSHATRA_COUNT,
    OUTPUT_DIR_REL_PATH,
    PADAS_PER_NAKSHATRA,
    PAKSHA_KRISHNA,
    PAKSHA_SHUKLA,
    PLANET_DATABASE_REL_PATH,
    RASHI_COUNT,
    RASHI_IN_ENG,
    RASHI_IN_SANSKRIT,
    RASHI_SIGN_LORD_IN_ENG,
    SHUKLA_PAKSHA_MAX_TITHI,
    SIGN_DEGREE_PHASE_BANDS,
    TITHI_AMAVASYA,
    TITHI_COUNT,
    TITHI_DEGREES_PER_TITHI,
    TITHI_NAME_1_TO_14,
    TITHI_PURNIMA,
    UNKNOWN_LABEL,
    VALID_HOUSE_SYSTEMS,
)


def remove_white_space(value: Any) -> str:
    """Strip edges, collapse runs of spaces, lowercase (for nakshatra/planet name matching)."""
    return " ".join(str(value or "").strip().lower().split())


class NavataraFinder:
    """Rotate nakshatra list from janma and attach nava-tara navatara sequences."""

    def __init__(self, planet_database: dict[str, Any]) -> None:
        self.nakshatras_dict = planet_database["nakshatras"]
        ntc = planet_database.get("nava_tara") or planet_database.get("nava_tara_chakra") or {}
        self.navatara_dict = ntc.get("navatara") or []
        self.nakshatra_name_with_index = {
            remove_white_space(item["nakshatra"]): idx
            for idx, item in enumerate(self.nakshatras_dict)
        }

    def rotate_nakshatras_starting_from_janma(self, nakshatra_name: str) -> list[dict[str, Any]] | None:
        nakshatra_key = remove_white_space(nakshatra_name)
        if nakshatra_key not in self.nakshatra_name_with_index:
            return None
        start_index = self.nakshatra_name_with_index[nakshatra_key]
        return self.nakshatras_dict[start_index:] + self.nakshatras_dict[:start_index]

    def build_navatara_with_nakshatra_rows(
        self, ordered_nakshatras: list[dict[str, Any]]
    ) -> list[dict[str, Any]]:
        navatara_with_nakshatras: list[dict[str, Any]] = []
        for navatara in self.navatara_dict:
            sequence_list = navatara.get("sequences") or navatara.get("sequence") or []
            navatara_copy = dict(navatara)
            navatara_copy["nakshatras"] = []
            for position in sequence_list:
                if 1 <= position <= len(ordered_nakshatras):
                    source = ordered_nakshatras[position - 1]
                    navatara_copy["nakshatras"].append(
                        {
                            "position_from_input": position,
                            "nakshatra": source["nakshatra"],
                            "ruling_planet": source["ruling_planet"],
                            "deity": source["deity"],
                            "tree": source["tree"],
                            "lucky_colors": source["lucky_colors"],
                            "lucky_number": source.get("lucky_number"),
                            "lucky_day": source.get("lucky_day"),
                            "lucky_time": source.get("lucky_time"),
                        }
                    )
            navatara_with_nakshatras.append(navatara_copy)
        return navatara_with_nakshatras

    def build_navatara_payload_for_janma_nakshatra(self, nakshatra_name: str) -> dict[str, Any] | None:
        ordered = self.rotate_nakshatras_starting_from_janma(nakshatra_name)
        if not ordered:
            return None
        return {
            "input_nakshatra": remove_white_space(nakshatra_name),
            "navatara_with_nakshatras": self.build_navatara_with_nakshatra_rows(ordered),
        }


class KundaliBuilder:
    """Build full kundali JSON: chart, enrichment, navatara, UI-ready tables."""

    def __init__(self, project_root: Path) -> None:
        self.root = project_root
        self.planet_db_path = project_root / PLANET_DATABASE_REL_PATH
        self.output_dir = project_root / OUTPUT_DIR_REL_PATH

    # --- public API ---

    def build_full_report(
        self,
        date_str: str,
        time_str: str,
        place_query: str,
        house_system: str = DEFAULT_HOUSE_SYSTEM,
    ) -> dict[str, Any]:
        """Birth chart + navatara + ``summary_table`` / ``planets_table`` / ``navatara_rows`` / ``ui_status_message``."""
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
            chart["geocode_alternatives"] = [
                {"name": x.get("name"), "country": x.get("country"), "timezone": x.get("timezone")}
                for x in geo["alternatives"]
            ]
        EnrichKundali(self.root).enrich_chart_for_api_and_ui(chart)
        return chart

    def write_report_to_file(self, report: dict[str, Any], path: Path) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    def create_dumps_kundali_chart(
        self,
        date_str: str,
        time_str: str,
        place_query: str,
        house_system: str = DEFAULT_HOUSE_SYSTEM,
    ) -> dict[str, Any]:
        """Build full kundali, write JSON dump to ``output/``, return report."""
        report = self.build_full_report(date_str, time_str, place_query, house_system)
        dump_path = self.output_dir / self.birth_output_filename(date_str, time_str, place_query)
        self.write_report_to_file(report, dump_path)
        try:
            rel = dump_path.relative_to(self.root)
        except ValueError:
            rel = dump_path
        rel_str = str(rel).replace("\\", "/")
        report["output_json_file"] = rel_str
        ui_msg = report.get("ui_status_message")
        if isinstance(ui_msg, str) and ui_msg:
            report["ui_status_message"] = f"{ui_msg} Saved to {rel_str}."
        return report

    @staticmethod
    def birth_output_filename(date_str: str, time_str: str, place_query: str) -> str:
        parts = time_str.strip().split(":")
        hh = parts[0].zfill(2) if parts else "00"
        mm = parts[1].zfill(2) if len(parts) > 1 else "00"
        ss = parts[2].zfill(2) if len(parts) > 2 else "00"
        slug = re.sub(r"[^a-z0-9]+", "_", place_query.strip().lower())
        slug = re.sub(r"_+", "_", slug).strip("_") or "place"
        if len(slug) > 96:
            slug = slug[:96].rstrip("_")
        return f"{date_str.strip()}_{hh}-{mm}-{ss}_{slug}.json"

    def print_debug_tables(self, report: dict[str, Any], stream: Any = sys.stderr) -> None:
        place = report.get("place_resolved") or {}
        print(f"[kundali] {report.get('place_query', '')} -> {place.get('name', '')}", file=stream)
        print(
            f"[kundali] local={report.get('datetime_local_iso', '')}  "
            f"UTC={report.get('datetime_utc_iso', '')}",
            file=stream,
        )
        asc = report.get("ascendant") or {}
        moon_n = report.get("moon_nakshatra") or {}
        if moon_n.get("nakshatra"):
            print(
                f"[kundali] Moon janma: {moon_n.get('nakshatra')} (pada {moon_n.get('pada', '')})",
                file=stream,
            )
        for p in report.get("planets") or []:
            print(
                f"  {p.get('name', ''):<8} h={p.get('whole_sign_house')} "
                f"{p.get('rashi_english', '')} vs_lord={p.get('planet_relation_with_rashi_lord', UNKNOWN_LABEL)}",
                file=stream,
            )
        print(file=stream)

    # --- geocoding & time ---

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
        h, m = int(parts[0]), int(parts[1]) if len(parts) > 1 else 0
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
                "retrograde": bool(spd < 0),
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

        moon = next(p for p in planets_out if p["name"] == "moon")
        nk_i, pada = self.longitude_to_nakshatra_pada(moon["sidereal_longitude"])
        nakshatras = self.load_nakshatra_list_from_database()
        moon_nak = dict(nakshatras[nk_i])
        moon_nak.pop("sequence", None)

        houses_ws = [
            {
                "house": bh + 1,
                "rashi_index": (lagna_idx + bh) % RASHI_COUNT,
                "rashi_english": RASHI_IN_ENG[(lagna_idx + bh) % RASHI_COUNT],
                "rashi_sanskrit": RASHI_IN_SANSKRIT[(lagna_idx + bh) % RASHI_COUNT],
                "cusps_longitude": round(float(cusps[bh]), 6) if bh < len(cusps) else None,
            }
            for bh in range(RASHI_COUNT)
        ]

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
            "ascendant": {
                "sidereal_longitude": round(asc_lon, 6),
                "rashi_index": lagna_idx,
                "rashi_english": lagna_en,
                "rashi_sanskrit": lagna_sa,
                "degree_in_rashi": round(lagna_deg, 4),
            },
            "houses_whole_sign": houses_ws,
            "planets": planets_out,
            "moon_nakshatra": {"nakshatra_index": nk_i + 1, "pada": pada, **moon_nak},
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

    # --- database ---

    def load_nakshatra_list_from_database(self) -> list[dict[str, Any]]:
        with self.planet_db_path.open(encoding="utf-8") as f:
            return list(json.load(f)["nakshatras"])


class EnrichKundali:
    """Add planet metadata, summary, nava-tara navatara, and UI-ready table rows to a chart."""

    def __init__(self, project_root: Path) -> None:
        self.root = project_root
        self.planet_db_path = project_root / PLANET_DATABASE_REL_PATH

    def load_planet_strength_rules(self) -> dict[str, int]:
        try:
            data = self.load_planet_database()
        except OSError:
            data = {}
        raw = data.get("planet_strength_rules") or {}
        return {
            "exalted_bonus": int(raw.get("exalted_bonus", EXALTED_STRENGTH_BONUS)),
            "debilitated_penalty": int(raw.get("debilitated_penalty", DEBILITATED_STRENGTH_PENALTY)),
            "min_percent": int(raw.get("min_percent", PLANET_STRENGTH_MIN_PERCENT)),
            "max_percent": int(raw.get("max_percent", PLANET_STRENGTH_MAX_PERCENT)),
        }

    def enrich_chart_for_api_and_ui(self, chart: dict[str, Any]) -> None:
        """Enrich chart in Python; UI reads ``planets_table`` / ``cell_styles`` as-is."""
        try:
            friendship = self.load_planet_friendship_lookup_table()
            strength_rules = self.load_planet_strength_rules()
        except OSError:
            friendship = {}
            strength_rules = {
                "exalted_bonus": EXALTED_STRENGTH_BONUS,
                "debilitated_penalty": DEBILITATED_STRENGTH_PENALTY,
                "min_percent": PLANET_STRENGTH_MIN_PERCENT,
                "max_percent": PLANET_STRENGTH_MAX_PERCENT,
            }

        chart["planet_strength_rules"] = strength_rules
        self.enrich_birth_planets_with_database_metadata(chart, friendship, strength_rules)
        self.attach_planet_navatara_from_janma(chart)
        self.attach_death_degree_flags(chart)
        self.attach_planet_table_ui_metadata(chart)
        self.add_kundali_summary_block(chart)
        self.add_lunar_calendar_to_summary(chart)
        self.attach_filtered_navatara_tables_for_moon_janma(chart)
        chart["planets_table"] = self.build_planets_table_rows(
            chart, self.load_houses_for_lookup()
        )
        chart["summary_table"] = self.build_summary_table_rows(chart)
        chart["ui_status_message"] = self.build_ui_status_message(chart)

    def load_planet_database(self) -> dict[str, Any]:
        with self.planet_db_path.open(encoding="utf-8") as f:
            return json.load(f)

    def load_houses_for_lookup(self) -> dict[int, list[str]]:
        try:
            data = self.load_planet_database()
        except OSError:
            return {}
        lookup: dict[int, list[str]] = {}
        for item in data.get("houses") or []:
            if not isinstance(item, dict):
                continue
            house = item.get("house")
            if isinstance(house, int) and 1 <= house <= 12:
                raw = item.get("for") or []
                lookup[house] = [str(x).strip() for x in raw if str(x).strip()]
        return lookup

    def load_planet_friendship_lookup_table(self) -> dict[str, Any]:
        data = self.load_planet_database()
        raw = data.get("PlanetFriendship")
        if isinstance(raw, dict):
            return dict(raw)
        table: dict[str, Any] = {}
        for p in data.get("planets") or []:
            if not isinstance(p, dict):
                continue
            key = remove_white_space(p.get("name", ""))
            if not key:
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
        try:
            return list(self.load_planet_database().get("nakshatras") or [])
        except OSError:
            return []

    def load_death_degree_rules(self) -> tuple[dict[str, list[dict[str, Any]]], list[dict[str, Any]]]:
        """Per-planet Mrityu Bhaga rules and lagna (ascendant) rules from planet.json."""
        try:
            data = self.load_planet_database()
        except OSError:
            return {}, []
        by_planet: dict[str, list[dict[str, Any]]] = {}
        for row in data.get("planets") or []:
            if not isinstance(row, dict):
                continue
            key = remove_white_space(row.get("name", ""))
            rules = row.get("death_degree")
            if key and isinstance(rules, list):
                by_planet[key] = [r for r in rules if isinstance(r, dict)]
        lagna_rules = data.get("death_degree_lagna")
        lagna_list = [r for r in lagna_rules if isinstance(r, dict)] if isinstance(
            lagna_rules, list
        ) else []
        return by_planet, lagna_list

    def enrich_birth_planets_with_database_metadata(
        self,
        chart: dict[str, Any],
        friendship: dict[str, Any],
        strength_rules: dict[str, int],
    ) -> None:
        nakshatra_list = self.load_nakshatra_list_from_database()
        asc = chart.get("ascendant") or {}
        lagna_rashi_index = asc.get("rashi_index")
        for p in chart.get("planets") or []:
            if not isinstance(p, dict):
                continue
            pkey = remove_white_space(p.get("name", ""))
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
            p["is_planet_in_6_8_12_house"] = self.dusthana_house_flag(p.get("whole_sign_house"))
            p["is_planet_lagna_lord_enemy"] = self.lagna_lord_enemy_flag(
                friendship, pkey, lagna_rashi_index
            )
            din = p.get("degree_in_rashi")
            if isinstance(din, (int, float)):
                phase = self.degree_phase_within_sign(float(din))
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
            lon = p.get("sidereal_longitude")
            if isinstance(lon, (int, float)) and nakshatra_list:
                nk_i, pada = KundaliBuilder.longitude_to_nakshatra_pada(float(lon))
                nak = dict(nakshatra_list[nk_i])
                nak.pop("sequence", None)
                p["nakshatra"] = nak.get("nakshatra") or ""
                p["nakshatra_pada"] = pada
                p["nakshatra_ruling_planet"] = nak.get("ruling_planet") or ""
                nlord = remove_white_space(str(p.get("nakshatra_ruling_planet") or ""))
                nstatus = EnrichKundali.natural_friendship_with_lord_planet(
                    friendship, pkey, nlord
                )
                p["planet_relation_with_nakshatra_lord"] = nstatus
                p["planet_status_in_nakshatra"] = EnrichKundali.planet_status_for_ui(
                    nstatus, None
                )
            else:
                p["nakshatra"] = ""
                p.pop("nakshatra_pada", None)
                p.pop("nakshatra_ruling_planet", None)
                p["planet_relation_with_nakshatra_lord"] = UNKNOWN_LABEL
                p["planet_status_in_nakshatra"] = UNKNOWN_LABEL

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
        strength_rules: dict[str, int],
    ) -> tuple[int | None, str | None]:
        if not isinstance(base_strength, (int, float)):
            return None, None
        rashi = remove_white_space(rashi_english).lower()
        exalted = remove_white_space(rules.get("Exalted", "")).lower()
        debilitated = remove_white_space(rules.get("Debilitated", "")).lower()
        dignity: str | None = None
        adjusted = int(base_strength)
        bonus = int(strength_rules.get("exalted_bonus", EXALTED_STRENGTH_BONUS))
        penalty = int(strength_rules.get("debilitated_penalty", DEBILITATED_STRENGTH_PENALTY))
        min_pct = int(strength_rules.get("min_percent", PLANET_STRENGTH_MIN_PERCENT))
        max_pct = int(strength_rules.get("max_percent", PLANET_STRENGTH_MAX_PERCENT))
        if exalted and rashi == exalted:
            dignity = PLANET_DIGNITY_EXALTED
            adjusted += bonus
        elif debilitated and rashi == debilitated:
            dignity = PLANET_DIGNITY_DEBILITATED
            adjusted -= penalty
        adjusted = max(min_pct, min(max_pct, adjusted))
        return adjusted, dignity

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
    def dusthana_house_flag(whole_sign_house: Any) -> str:
        if isinstance(whole_sign_house, int) and whole_sign_house in HOUSE_6_8_12:
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
        by_planet, lagna_rules = self.load_death_degree_rules()
        asc = chart.get("ascendant")
        if isinstance(asc, dict):
            asc["is_lagna_at_death_degree"] = EnrichKundali.death_degree_flag(
                str(asc.get("rashi_english") or ""),
                asc.get("degree_in_rashi"),
                lagna_rules,
            )
        for p in chart.get("planets") or []:
            if not isinstance(p, dict):
                continue
            pkey = remove_white_space(p.get("name", ""))
            p["is_planet_at_death_degree"] = EnrichKundali.death_degree_flag(
                str(p.get("rashi_english") or ""),
                EnrichKundali.degree_in_sign_for_death_match(p),
                by_planet.get(pkey),
            )
            if p["is_planet_at_death_degree"] == HOUSE_6_8_12_YES:
                EnrichKundali.apply_death_degree_strength_override(p)

    @staticmethod
    def apply_death_degree_strength_override(planet: dict[str, Any]) -> None:
        """Mrityu Bhaga hit: force 0% strength in JSON (phase label + planet_strength)."""
        zero = int(PLANET_STRENGTH_DEATH_DEGREE_PERCENT)
        planet["planet_strength"] = zero
        if planet.get("planet_strength_base") is not None:
            planet["planet_strength_base"] = zero
        phase = planet.get("sign_degree_phase")
        if isinstance(phase, dict):
            phase["strength_percent"] = zero
            phase["label"] = f"{zero}%"

    @staticmethod
    def strength_cell_color_kind(strength: Any, at_death_degree: Any = HOUSE_6_8_12_NO) -> str:
        """Green above 100%; red at death degree or 0%; no tint otherwise."""
        if str(at_death_degree or "").strip().lower() == HOUSE_6_8_12_YES:
            return PLANET_RELATION_ENEMY
        if not isinstance(strength, (int, float)):
            return ""
        if strength > STRENGTH_HIGH_GREEN_THRESHOLD_PERCENT:
            return PLANET_STATUS_HIGH
        if strength <= 0:
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
    def build_planet_cell_styles(planet: dict[str, Any]) -> dict[str, str]:
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
                planet.get("planet_strength"), death_deg
            ),
            "is_planet_at_death_degree": EnrichKundali.enemy_cell_color_if_yes(death_deg),
            "is_planet_in_6_8_12_house": EnrichKundali.enemy_cell_color_if_yes(malefic),
            "is_planet_lagna_lord_enemy": EnrichKundali.enemy_cell_color_if_yes(lagna_enemy),
            "planet_status_in_rashi": status_rashi_color,
            "planet_status_in_nakshatra": status_nak_color,
            "navatara": EnrichKundali.enemy_cell_color_if_yes(nav_harmful),
        }

    def attach_planet_table_ui_metadata(self, chart: dict[str, Any]) -> None:
        """Attach ``cell_styles``, display labels, and chart color on each planet."""
        for p in chart.get("planets") or []:
            if not isinstance(p, dict):
                continue
            p["cell_styles"] = EnrichKundali.build_planet_cell_styles(p)
            if p.get("is_planet_at_death_degree") == HOUSE_6_8_12_YES:
                p["planet_status_color"] = PLANET_RELATION_ENEMY
            else:
                p["planet_status_color"] = EnrichKundali.planet_status_color_kind(
                    p.get("planet_status_in_rashi")
                    or p.get("planet_relation_with_rashi_lord")
                )
            p["malefic_6_8_12_display"] = EnrichKundali.yes_no_display(
                p.get("is_planet_in_6_8_12_house")
            )
            p["is_planet_lagna_lord_enemy_display"] = EnrichKundali.yes_no_display(
                p.get("is_planet_lagna_lord_enemy")
            )
            p["is_planet_at_death_degree_display"] = EnrichKundali.yes_no_display(
                p.get("is_planet_at_death_degree")
            )

    @staticmethod
    def degree_phase_within_sign(deg_in_rashi: float) -> dict[str, Any]:
        d = float(deg_in_rashi) % ONE_HOUSE_DEGREES
        lo, hi, phase, pct = SIGN_DEGREE_PHASE_BANDS[-1]
        for band_lo, band_hi, band_phase, band_pct in SIGN_DEGREE_PHASE_BANDS:
            if d < band_hi:
                lo, hi, phase, pct = band_lo, band_hi, band_phase, band_pct
                break
        return {
            "phase_english": phase,
            "strength_percent": pct,
            "range_low_deg_in_sign": lo,
            "range_high_deg_in_sign": hi,
            "at_birth_degrees_in_sign": round(d, 4),
            "label": f"{pct}%",
        }

    def add_kundali_summary_block(self, chart: dict[str, Any]) -> None:
        asc = chart.get("ascendant") or {}
        mn = chart.get("moon_nakshatra") or {}
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

    def attach_planet_navatara_from_janma(self, chart: dict[str, Any]) -> None:
        """Set ``planet_navatara`` on each planet from Moon janma nava-tara wheel."""
        mn = chart.get("moon_nakshatra") or {}
        janma = str(mn.get("nakshatra") or "").strip()
        lookup: dict[str, str] = {}
        if janma:
            try:
                data = self.load_planet_database()
                payload = NavataraFinder(data).build_navatara_payload_for_janma_nakshatra(
                    janma
                )
                if payload:
                    lookup = self.build_nakshatra_to_navatara_lookup(
                        payload.get("navatara_with_nakshatras") or []
                    )
            except OSError:
                lookup = {}
        for p in chart.get("planets") or []:
            if not isinstance(p, dict):
                continue
            nk = remove_white_space(str(p.get("nakshatra") or ""))
            nav = lookup.get(nk, "")
            p["planet_navatara"] = nav
            p["is_planet_navatara_harmful"] = (
                HOUSE_6_8_12_YES
                if remove_white_space(nav) in HARMFUL_NAVATARA_NAMES
                else HOUSE_6_8_12_NO
            )

    def attach_filtered_navatara_tables_for_moon_janma(self, chart: dict[str, Any]) -> None:
        janma = str((chart.get("moon_nakshatra") or {}).get("nakshatra") or "").strip()
        if not janma:
            chart["navatara"] = None
            chart["navatara_rows"] = []
            return
        ch = self.build_filtered_navatara_payload_for_janma(janma, chart.get("planets"))
        chart["navatara_rows"] = ch.pop("navatara_rows", []) or []
        chart["navatara"] = ch

    def build_filtered_navatara_payload_for_janma(
        self,
        janma_nakshatra: str,
        planets: list[dict[str, Any]] | None = None,
    ) -> dict[str, Any]:
        """Nava-tara navatara + flat ``navatara_rows``; omit helpful rows for dusthana planets."""
        data = self.load_planet_database()
        finder = NavataraFinder(data)
        raw = finder.build_navatara_payload_for_janma_nakshatra(janma_nakshatra)
        if not raw:
            raise ValueError(f"nakshatra not found: {janma_nakshatra!r}")

        removed: list[dict[str, Any]] = []
        dusthana_keys: set[str] = set()
        if planets:
            dusthana_keys = self.collect_dusthana_planet_keys_from_birth_chart(planets)
            raw, removed = self.filter_helpful_navatara_rows_by_dusthana_planets(raw, dusthana_keys)

        return {
            **raw,
            "navatara_rows": self.build_navatara_table_rows(raw),
            "dusthana_filter": {
                "planets_in_dusthana_by_name": sorted(dusthana_keys),
                "removed_count": len(removed),
                "removed": removed,
            },
        }

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
            h = p.get("whole_sign_house")
            if isinstance(h, int) and h in HOUSE_6_8_12:
                keys.add(remove_white_space(p.get("name")))
        return keys

    @staticmethod
    def navatara_row_is_marked_auspicious(navatara: dict[str, Any]) -> bool:
        v = str(navatara.get("auspicious", "")).lower().strip()
        return v in AUSPICIOUS_NAVATARA_VALUES

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
    def build_navatara_table_rows(
        navatara_payload: dict[str, Any],
    ) -> list[dict[str, Any]]:
        """One UI row per nava-tara (9 rows): helpful first, then navatara order."""
        rows: list[dict[str, Any]] = []
        for order, navatara in enumerate(navatara_payload.get("navatara_with_nakshatras") or []):
            if not isinstance(navatara, dict):
                continue
            nakshatra_names: list[str] = []
            ruling_planets: list[str] = []
            deities: list[str] = []
            trees: list[str] = []
            color_parts: list[str] = []
            nakshatra_items: list[dict[str, Any]] = []
            for item in navatara.get("nakshatras") or []:
                if not isinstance(item, dict):
                    continue
                nakshatra_items.append(item)
                if item.get("nakshatra"):
                    nakshatra_names.append(str(item["nakshatra"]))
                if item.get("ruling_planet"):
                    ruling_planets.append(str(item["ruling_planet"]))
                if item.get("deity"):
                    deities.append(str(item["deity"]))
                colors = item.get("lucky_colors") or []
                if item.get("tree"):
                    trees.append(str(item["tree"]))
                if isinstance(colors, list):
                    color_parts.extend(str(c) for c in colors)
                elif colors:
                    color_parts.append(str(colors))
            auspicious = str(navatara.get("auspicious") or "").strip().lower()
            rows.append(
                {
                    "navatara_order": order,
                    "helpful_sort": 0 if auspicious in AUSPICIOUS_NAVATARA_VALUES else 1,
                    "auspicious": navatara.get("auspicious") or "",
                    "navatara": navatara.get("name") or "",
                    "about": navatara.get("result") or "",
                    "nakshatra": ", ".join(nakshatra_names),
                    "ruling_planet": EnrichKundali._dedupe_comma_list(ruling_planets),
                    "divine_god": ", ".join(deities),
                    "tree": ", ".join(trees),
                    "lucky_colors": ", ".join(color_parts),
                    "lucky_number": EnrichKundali._join_lucky_numbers(nakshatra_items),
                    "lucky_day": EnrichKundali._join_lucky_days(nakshatra_items),
                    "lucky_time": EnrichKundali._join_lucky_times(nakshatra_items),
                }
            )
        rows.sort(key=lambda r: (r["helpful_sort"], r["navatara_order"]))
        for row in rows:
            row.pop("helpful_sort", None)
            row.pop("navatara_order", None)
        return rows

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
    def build_planets_table_rows(
        chart: dict[str, Any],
        houses_by_number: dict[int, list[str]] | None = None,
    ) -> list[dict[str, Any]]:
        houses = houses_by_number or {}
        rows: list[dict[str, Any]] = []
        for p in sorted(
            chart.get("planets") or [],
            key=lambda x: (x.get("whole_sign_house") or 99, x.get("name") or ""),
        ):
            if not isinstance(p, dict):
                continue
            strength = p.get("planet_strength")
            house_num = p.get("whole_sign_house")
            for_list: list[str] = []
            if isinstance(house_num, int):
                for_list = houses.get(house_num) or []
            malefic = p.get("is_planet_in_6_8_12_house", HOUSE_6_8_12_NO)
            lagna_enemy = p.get("is_planet_lagna_lord_enemy", HOUSE_6_8_12_NO)
            nav_harmful = p.get("is_planet_navatara_harmful", HOUSE_6_8_12_NO)
            death_deg = p.get("is_planet_at_death_degree", HOUSE_6_8_12_NO)
            rashi_status = (
                p.get("planet_status_in_rashi")
                or p.get("planet_relation_with_rashi_lord")
                or UNKNOWN_LABEL
            )
            nak_status = (
                p.get("planet_status_in_nakshatra")
                or p.get("planet_relation_with_nakshatra_lord")
                or UNKNOWN_LABEL
            )
            rows.append({
                "house": house_num,
                "house_for": EnrichKundali.format_house_for_display(for_list),
                "planet": p.get("name"),
                "degree": EnrichKundali.planet_degree_in_sign_display(p),
                "is_planet_in_6_8_12_house": malefic,
                "malefic_6_8_12": malefic,
                "malefic_6_8_12_display": EnrichKundali.yes_no_display(malefic),
                "is_planet_lagna_lord_enemy": lagna_enemy,
                "is_planet_lagna_lord_enemy_display": EnrichKundali.yes_no_display(
                    lagna_enemy
                ),
                "is_planet_at_death_degree": death_deg,
                "is_planet_at_death_degree_display": EnrichKundali.yes_no_display(
                    death_deg
                ),
                "rashi": f"{p.get('rashi_english', '')} ({p.get('rashi_sanskrit', '')})",
                "nakshatra": EnrichKundali.format_planet_nakshatra_display(
                    str(p.get("nakshatra") or ""),
                    p.get("nakshatra_pada"),
                ),
                "navatara": p.get("planet_navatara") or "",
                "is_planet_navatara_harmful": nav_harmful,
                "strength": f"{strength}%" if strength is not None else UNKNOWN_LABEL,
                "strength_percent": strength if isinstance(strength, (int, float)) else None,
                "planet_status_in_nakshatra": nak_status,
                "planet_status_in_rashi": rashi_status,
                "cell_styles": p.get("cell_styles")
                or EnrichKundali.build_planet_cell_styles(p),
                "retrograde": "Yes" if p.get("retrograde") else "No",
            })
        return rows

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
        mn = chart.get("moon_nakshatra") or {}
        nak = str(mn.get("nakshatra") or "").strip()
        if nak:
            rows.append({
                "label": "Janma Nakshatra",
                "value": (
                    f"{nak.title()} · Pada {mn.get('pada', '')} · "
                    f"{str(mn.get('ruling_planet', '')).strip().title()}"
                ),
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
        asc = chart.get("ascendant") or {}
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
        retrograde = [
            str(p.get("name") or "").strip().title()
            for p in chart.get("planets") or []
            if isinstance(p, dict) and p.get("retrograde")
        ]
        rows.append({"label": "Retrograde", "value": ", ".join(retrograde) if retrograde else "None"})
        return rows

    @staticmethod
    def build_ui_status_message(chart: dict[str, Any]) -> str:
        moon = str((chart.get("moon_nakshatra") or {}).get("nakshatra") or "").strip()
        if not moon:
            return "Loaded."
        msg = f"Loaded chart for Moon janma: {moon}."
        removed = int((chart.get("navatara") or {}).get("dusthana_filter", {}).get("removed_count") or 0)
        if removed:
            msg += f" ({removed} helpful row(s) omitted — dusthana houses 6/8/12.)"
        return msg


# --- module API (Flask, scripts) ---

def build_full_kundali(
    root: Path,
    date_str: str,
    time_str: str,
    place_query: str,
    house_system: str = DEFAULT_HOUSE_SYSTEM,
) -> dict[str, Any]:
    """Build chart + UI tables, write ``output/<birth>.json`` via ``create_dumps_kundali_chart``."""
    return KundaliBuilder(root).create_dumps_kundali_chart(
        date_str, time_str, place_query, house_system
    )


def build_navatara(
    root: Path,
    janma_nakshatra: str,
    planets: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    """Standalone navatara build (CLI / legacy imports)."""
    return EnrichKundali(root).build_filtered_navatara_payload_for_janma(janma_nakshatra, planets)

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

    text = json.dumps(report, indent=2, ensure_ascii=False)
    if args.output:
        builder.write_report_to_file(report, args.output)
        print(f"wrote {args.output}", file=sys.stderr)
    else:
        print(text)


if __name__ == "__main__":
    main()
