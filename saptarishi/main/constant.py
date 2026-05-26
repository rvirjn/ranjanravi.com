"""Shared constants for saptarishi kundali, navatara, and Flask API."""

from __future__ import annotations

from dataclasses import dataclass

import swisseph as swe

# --- paths (relative to project root) ---
DATA_JSON_REL_PATH = "database/data.json"
OUTPUT_DIR_REL_PATH = "output"
EPHEMERIS_DIR_REL_PATH = "ephe"

# --- zodiac & nakshatra ---
RASHI_IN_ENG = (
    "aries", "taurus", "gemini", "cancer", "leo", "virgo",
    "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces",
)
RASHI_IN_SANSKRIT = (
    "mesha", "vrishabha", "mithuna", "karka", "simha", "kanya",
    "tula", "vrishchika", "dhanu", "makara", "kumbha", "meena",
)
RASHI_SIGN_LORD_IN_ENG = (
    "mars", "venus", "mercury", "moon", "sun", "mercury",
    "venus", "mars", "jupiter", "saturn", "saturn", "jupiter",
)
RASHI_COUNT = len(RASHI_IN_ENG)
# Sign number in chart diamonds: 1=aries … 5=leo … 7=libra (tula) … 12=pisces (rashi_index + 1).

# North Indian fixed layout (anticlockwise from lagna). cx/cy = label center per visual cell.
#   [2]  [1]  [12]
# [3]        [11]
# [4]          [10]
# [5]          [9]
#   [6] [7] [8]
NORTH_INDIAN_HOUSE_REGIONS = (
    (1, "", 50, 14),
    (2, "", 26, 12),
    (3, "", 12, 27),
    (4, "", 12, 54),
    (5, "", 12, 72),
    (6, "", 30, 88),
    (7, "", 50, 88),
    (8, "", 70, 88),
    (9, "", 88, 72),
    (10, "", 88, 54),
    (11, "", 88, 27),
    (12, "", 74, 12),
)

PLANET_SHORT = {
    "sun": "Su",
    "moon": "Mo",
    "mars": "Ma",
    "mercury": "Me",
    "jupiter": "Ju",
    "venus": "Ve",
    "saturn": "Sa",
    "rahu": "Ra",
    "ketu": "Ke",
}
NAKSHATRA_COUNT = 27
FULL_CIRCLE_DEGREES = 360.0
ONE_HOUSE_DEGREES = FULL_CIRCLE_DEGREES / RASHI_COUNT
ONE_NAKSHATRA_DEGREES = FULL_CIRCLE_DEGREES / NAKSHATRA_COUNT
PADAS_PER_NAKSHATRA = 4
DEGREES_180 = FULL_CIRCLE_DEGREES / 2

# --- houses ---
HOUSE_6_8_12 = frozenset({6, 8, 12})
DEFAULT_HOUSE_SYSTEM = "W"
VALID_HOUSE_SYSTEMS = ("W", "P", "A")

# --- yes / no (JSON / API) ---
HOUSE_6_8_12_YES = "yes"
HOUSE_6_8_12_NO = "no"

# --- ayanamsa & ephemeris ---
AYANAMSA_NAME = "lahiri"

# --- geocoding ---
GEOCODE_API_SEARCH_URL = (
    "https://geocoding-api.open-meteo.com/v1/search?name={query}&count={count}&language=en"
)
GEOCODE_RESULT_COUNT = 5
GEOCODE_ALTERNATIVE_COUNT = GEOCODE_RESULT_COUNT - 1
GEOCODE_USER_AGENT = "saptarishi-kundali/1.0"
GEOCODE_TIMEOUT_SECONDS = 20

# --- lunar calendar (tithi / paksha) ---
TITHI_NAME_1_TO_14 = (
    "Pratipada", "Dwitiya", "Tritiya", "Chaturthi", "Panchami", "Shashthi",
    "Saptami", "Ashtami", "Navami", "Dashami", "Ekadashi", "Dwadashi",
    "Trayodashi", "Chaturdashi",
)
TITHI_DEGREES_PER_TITHI = 12.0
TITHI_COUNT = int(FULL_CIRCLE_DEGREES / TITHI_DEGREES_PER_TITHI)
SHUKLA_PAKSHA_MAX_TITHI = TITHI_COUNT // 2
PAKSHA_SHUKLA = "Shukla"
PAKSHA_KRISHNA = "Krishna"
TITHI_PURNIMA = "Purnima"
TITHI_AMAVASYA = "Amavasya"
UNKNOWN_LABEL = "—"
KUNDALI_READY_STATUS_MESSAGE = (
    "Kundali Chart prepared and planet/nakshtra table is also ready"
)

# --- Vimshottari mahadasha (120-year cycle from Moon janma nakshatra) ---
VIMSHOTTARI_MAHADASHA_SEQUENCE = (
    "ketu",
    "venus",
    "sun",
    "moon",
    "mars",
    "rahu",
    "jupiter",
    "saturn",
    "mercury",
)
VIMSHOTTARI_CYCLE_YEARS = 120
DEFAULT_MAHADASHA_YEARS_BY_PLANET = {
    "ketu": 7,
    "venus": 20,
    "sun": 6,
    "moon": 10,
    "mars": 7,
    "rahu": 18,
    "jupiter": 16,
    "saturn": 19,
    "mercury": 17,
}

# --- sign degree strength bands (fallback if data.json omits degree_in_sign_bands) ---
_SIGN_PHASE_STEP = ONE_HOUSE_DEGREES / 5
DEFAULT_SIGN_DEGREE_PHASE_BANDS = tuple(
    (
        i * _SIGN_PHASE_STEP,
        (i + 1) * _SIGN_PHASE_STEP,
        phase,
        pct,
    )
    for i, (phase, pct) in enumerate(
        (("born", 25), ("child", 50), ("youth", 100), ("old", 50), ("dead", 25))
    )
)
# Backward-compatible alias
SIGN_DEGREE_PHASE_BANDS = DEFAULT_SIGN_DEGREE_PHASE_BANDS

# --- planet friendship labels ---
PLANET_RELATION_OWN = "own"
PLANET_RELATION_FRIEND = "friend"
PLANET_RELATION_ENEMY = "enemy"
PLANET_RELATION_NEUTRAL = "neutral"

# Exaltation / debilitation (defaults; overridden by database/data.json planet_strength_rules).
EXALTED_STRENGTH_BONUS = 100
DEBILITATED_STRENGTH_PENALTY = 100
PLANET_STRENGTH_MIN_PERCENT = 0
PLANET_STRENGTH_MAX_PERCENT = 200
STRENGTH_HIGH_GREEN_THRESHOLD_PERCENT = 100
PLANET_STRENGTH_DEATH_DEGREE_PERCENT = 0
PLANET_DIGNITY_EXALTED = "exalted"
PLANET_DIGNITY_DEBILITATED = "debilitated"
PLANET_STATUS_HIGH = "high"
PLANET_STATUS_LOW = "low"

# --- navatara auspicious markers ---
AUSPICIOUS_NAVATARA_VALUES = frozenset({HOUSE_6_8_12_YES, "true", "1"})
HARMFUL_NAVATARA_NAMES = frozenset({"vadha", "vipat", "pratyari"})

# --- Flask API ---
SERVICE_NAME = "saptarishi"
FLASK_HOST = "0.0.0.0"
FLASK_PORT = 8081
MAX_PLACE_QUERY_LENGTH = 240

# --- Mongo defaults (read_collection CLI) ---
MONGO_DEFAULT_URI = "mongodb://host.docker.internal:27017"
MONGO_DEFAULT_DB = SERVICE_NAME
MONGO_DEFAULT_COLLECTION = "ocr_results"
MONGO_DEFAULT_DOCUMENT_LIMIT = 20


@dataclass
class GrahaBody:
    key: str
    swiss_body_id: int


DEFAULT_GRAHA_BODIES = (
    GrahaBody("sun", swe.SUN),
    GrahaBody("moon", swe.MOON),
    GrahaBody("mercury", swe.MERCURY),
    GrahaBody("venus", swe.VENUS),
    GrahaBody("mars", swe.MARS),
    GrahaBody("jupiter", swe.JUPITER),
    GrahaBody("saturn", swe.SATURN),
    GrahaBody("rahu", swe.TRUE_NODE),
)

# Ketu is derived in chart (not a separate Swiss body); all graha names for lookups
PLANET_NAMES = frozenset(g.key for g in DEFAULT_GRAHA_BODIES) | {"ketu"}
