# Copyright © 2018-2026 ranjanravi.com. All rights reserved.
"""Shared constants for saptarishi kundali, navatara, and Flask API."""

from __future__ import annotations

import os
from dataclasses import dataclass

import swisseph as swe

# --- paths (relative to project root) ---
DATA_JSON_REL_PATH = "database/data.json"
USERS_JSON_REL_PATH = "database/users.json"
# Google Drive file for production user DB (share file with service account email).
USERS_GDRIVE_FILE_ID = "1nJFTRaRi-I7YWwu7KnkI-lHWjGlH2R-H"
USERS_GDRIVE_MIME_TYPE = "application/json"
# Local service account key (gitignored); share Drive file with client_email in JSON.
USERS_GDRIVE_CREDENTIALS_REL_PATH = "database/database-497809-3e1d0c4b0858.json"
OUTPUT_DIR_REL_PATH = "output"
KUNDALI_OUTPUT_SUBDIR = "kundali"
AUSPICIOUS_OUTPUT_SUBDIR = "auspicious"
OUTPUT_MAX_FILES = 10
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

# --- planet friendship labels ---
PLANET_RELATION_OWN = "own"
PLANET_RELATION_FRIEND = "friend"
PLANET_RELATION_ENEMY = "enemy"
PLANET_RELATION_NEUTRAL = "neutral"

PLANET_DIGNITY_EXALTED = "exalted"
PLANET_DIGNITY_DEBILITATED = "debilitated"
PLANET_STATUS_HIGH = "high"
PLANET_STATUS_LOW = "low"

# --- Flask API ---
SERVICE_NAME = "saptarishi"
FLASK_HOST = "0.0.0.0"
FLASK_PORT = 8081
FLASK_PUBLIC_API_ORIGIN = "https://api.ranjanravi.com"
MAX_PLACE_QUERY_LENGTH = 240
API_AUSPICIOUS_PATH = "/api/auspicious"
AUSPICIOUS_SLOT_HOUR_STEP = 2
AUSPICIOUS_TOP_COUNT = 5
AUSPICIOUS_MAX_RANGE_DAYS = 62
AUSPICIOUS_OUTPUT_BASENAME = AUSPICIOUS_OUTPUT_SUBDIR
AUSPICIOUS_READY_STATUS_MESSAGE = "Top auspicious date and time slots are ready"

# --- Auth / commercial limits (shared per public IP for guest + logged-in) ---
MAX_KUNDALI_PER_IP = 5
MAX_AUSPICIOUS_PER_IP = 2
MAX_KUNDALI_PER_USER = MAX_KUNDALI_PER_IP
MAX_AUSPICIOUS_PER_USER = MAX_AUSPICIOUS_PER_IP
MAX_KUNDALI_PER_GUEST = MAX_KUNDALI_PER_IP
MAX_AUSPICIOUS_PER_GUEST = MAX_AUSPICIOUS_PER_IP
PREMIUM_AMOUNT_INR = int(os.environ.get("SAPTARISHI_PREMIUM_AMOUNT_INR", "499"))
PREMIUM_CONTACT_PHONE = os.environ.get("SAPTARISHI_PREMIUM_CONTACT_PHONE", "8184046618")
AUTH_TOKEN_HEADER = "Authorization"
AUTH_TOKEN_PREFIX = "Bearer "
GUEST_ID_HEADER = "X-Guest-Id"
GUEST_ID_MAX_LENGTH = 64
SESSION_TTL_DAYS = 30
SESSIONS_MAX_PER_USER = 3
MIN_PASSWORD_LENGTH = 4
MOBILE_DIGITS_MIN = 10
MOBILE_DIGITS_MAX = 15
BIRTH_VIEWS_MAX = 100
GUESTS_MAX = 2000
USAGE_BY_IP_MAX = 2000
SITE_VIEW_BATCH_SIZE = 5

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
