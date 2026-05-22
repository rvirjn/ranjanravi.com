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

    def enrich_chart_for_api_and_ui(self, chart: dict[str, Any]) -> None:
        try:
            friendship = self.load_planet_friendship_lookup_table()
        except OSError:
            friendship = {}

        self.enrich_birth_planets_with_database_metadata(chart, friendship)
        self.add_kundali_summary_block(chart)
        self.add_lunar_calendar_to_summary(chart)
        self.attach_filtered_navatara_tables_for_moon_janma(chart)
        chart["planets_table"] = self.build_planets_table_rows(chart)
        chart["summary_table"] = self.build_summary_table_rows(chart)
        chart["ui_status_message"] = self.build_ui_status_message(chart)

    def load_planet_database(self) -> dict[str, Any]:
        with self.planet_db_path.open(encoding="utf-8") as f:
            return json.load(f)

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

    def enrich_birth_planets_with_database_metadata(
        self, chart: dict[str, Any], friendship: dict[str, Any]
    ) -> None:
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
            p["is_planet_in_6_8_12_house"] = self.dusthana_house_flag(p.get("whole_sign_house"))
            din = p.get("degree_in_rashi")
            if isinstance(din, (int, float)):
                phase = self.degree_phase_within_sign(float(din))
                p["sign_degree_phase"] = phase
                p.pop("degree_in_rashi", None)
                p["planet_strength"] = phase.get("strength_percent")
            else:
                p["sign_degree_phase"] = None
                p["planet_strength"] = None

    @staticmethod
    def natural_friendship_with_sign_lord(
        friendship: dict[str, Any], planet_key: str, rashi_index: int
    ) -> tuple[str, str]:
        if not planet_key or not (0 <= rashi_index < RASHI_COUNT):
            return UNKNOWN_LABEL, ""
        sign_lord = RASHI_SIGN_LORD_IN_ENG[rashi_index]
        if planet_key == sign_lord:
            return PLANET_RELATION_OWN, sign_lord
        row = friendship.get(planet_key)
        if not isinstance(row, dict):
            return UNKNOWN_LABEL, sign_lord
        friends = [remove_white_space(x) for x in (row.get("Friends") or [])]
        enemies = [remove_white_space(x) for x in (row.get("Enemies") or [])]
        neutrals = [remove_white_space(x) for x in (row.get("Neutral") or [])]
        if sign_lord in friends:
            return PLANET_RELATION_FRIEND, sign_lord
        if sign_lord in enemies:
            return PLANET_RELATION_ENEMY, sign_lord
        if sign_lord in neutrals:
            return PLANET_RELATION_NEUTRAL, sign_lord
        return UNKNOWN_LABEL, sign_lord

    @staticmethod
    def dusthana_house_flag(whole_sign_house: Any) -> str:
        if isinstance(whole_sign_house, int) and whole_sign_house in HOUSE_6_8_12:
            return HOUSE_6_8_12_YES
        return HOUSE_6_8_12_NO

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
            for item in navatara.get("nakshatras") or []:
                if not isinstance(item, dict):
                    continue
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
                    "ruling_planet": ", ".join(ruling_planets),
                    "deity": ", ".join(deities),
                    "tree": ", ".join(trees),
                    "lucky_colors": ", ".join(color_parts),
                }
            )
        rows.sort(key=lambda r: (r["helpful_sort"], r["navatara_order"]))
        for row in rows:
            row.pop("helpful_sort", None)
            row.pop("navatara_order", None)
        return rows

    @staticmethod
    def build_planets_table_rows(chart: dict[str, Any]) -> list[dict[str, Any]]:
        rows: list[dict[str, Any]] = []
        for p in sorted(
            chart.get("planets") or [],
            key=lambda x: (x.get("whole_sign_house") or 99, x.get("name") or ""),
        ):
            if not isinstance(p, dict):
                continue
            strength = p.get("planet_strength")
            rows.append({
                "house": p.get("whole_sign_house"),
                "planet": p.get("name"),
                "rashi": f"{p.get('rashi_english', '')} ({p.get('rashi_sanskrit', '')})",
                "strength": f"{strength}%" if strength is not None else UNKNOWN_LABEL,
                "strength_percent": strength if isinstance(strength, (int, float)) else None,
                "planet_status_in_rashi": p.get("planet_relation_with_rashi_lord") or UNKNOWN_LABEL,
                "retrograde": "Yes" if p.get("retrograde") else "No",
            })
        return rows

    @staticmethod
    def build_summary_table_rows(chart: dict[str, Any]) -> list[dict[str, str]]:
        rows: list[dict[str, str]] = []
        local = str(chart.get("datetime_local_iso") or "").strip()
        if local:
            rows.append({"label": "Local time", "value": local})
        mn = chart.get("moon_nakshatra") or {}
        nak = str(mn.get("nakshatra") or "").strip()
        if nak:
            rows.append({
                "label": "Moon janma",
                "value": f"{nak} · pada {mn.get('pada', '')} · {mn.get('ruling_planet', '')}",
            })
        lunar = (chart.get("kundali_summary") or {}).get("lunar_calendar") or {}
        for label, key in (
            ("Weekday", "weekday_english"),
            ("Paksha", "paksha_english"),
            ("Tithi", "tithi_name_english"),
        ):
            if lunar.get(key):
                rows.append({"label": label, "value": str(lunar[key])})
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
    return KundaliBuilder(root).build_full_report(date_str, time_str, place_query, house_system)


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
    """Build kundali, persist ``output/<birth>.json``, return full report."""
    return KundaliBuilder(root).create_dumps_kundali_chart(
        date_str, time_str, place_query, house_system
    )


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
