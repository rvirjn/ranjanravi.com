// Copyright © 2018-2026 ranjanravi.com. All rights reserved.

/** Shared UI constants (keep in sync with backend/utils/constant.py where applicable). */
const _DEPLOY_PREFIX =
  typeof window !== "undefined" && window.SAPTARISHI_DEPLOY_PREFIX != null
    ? window.SAPTARISHI_DEPLOY_PREFIX
    : "";

const SAPTARISHI_CONSTANTS = {
  // --- Runtime / deploy ---
  /** Empty on subdomain/Docker; "/saptarishi" on GitHub Pages subdirectory deploy. */
  DEPLOY_PREFIX: _DEPLOY_PREFIX,
  FLASK_PORT: 8081,
  /** Document base for relative assets when the browser shows /kundali, /auspicious, etc. */
  HTML_BASE: _DEPLOY_PREFIX + "/frontend/html/",
  /** Production API (Render). Local UI uses localhost:8081 instead. */
  PRODUCTION_API_ORIGIN: "https://api.ranjanravi.com",

  // --- Frontend routes ---
  PAGE_FILE_TO_PATH: {
    "kundali.html": _DEPLOY_PREFIX + "/kundali",
    "auspicious.html": _DEPLOY_PREFIX + "/auspicious",
    "remedy.html": _DEPLOY_PREFIX + "/remedy",
    "profile.html": _DEPLOY_PREFIX + "/profile",
    "login.html": _DEPLOY_PREFIX + "/login"
  },

  // --- API endpoints ---
  DEFAULT_HOUSE_SYSTEM: "W",
  API_KUNDALI_PATH: "/api/kundali",
  API_KUNDALI_COMPARE_PATH: "/api/kundali/compare",
  API_AUSPICIOUS_PATH: "/api/auspicious",
  API_PLANET_DATABASE_PATH: "/api/planet-database",
  API_AUTH_REGISTER_PATH: "/api/auth/register",
  API_AUTH_LOGIN_PATH: "/api/auth/login",
  API_AUTH_PROFILE_PATH: "/api/auth/profile",
  API_AUTH_PROFILE_UPDATE_PATH: "/api/auth/profile/update",
  API_AUTH_LOGOUT_PATH: "/api/auth/logout",
  API_AUTH_ME_PATH: "/api/auth/me",
  API_SITE_VIEW_PATH: "/api/site/view",
  API_USAGE_PATH: "/api/usage",
  API_PREMIUM_INFO_PATH: "/api/premium/info",
  API_PREMIUM_ACTIVATE_PATH: "/api/premium/activate",

  // --- Usage / auth headers ---
  GUEST_ID_HEADER: "X-Guest-Id",
  MAX_FREE_QUERIES_PER_USER: 5,
  MAX_FREE_QUERIES_PER_GUEST: 5,
  PLACE_CUSTOM_VALUE: "__custom__",
  MAX_PLACE_QUERY_LENGTH: 240,

  // --- Premium / support ---
  PREMIUM_PACK_AMOUNT_INR: 299,
  PREMIUM_PACK_QUERY_LIMIT: 50,
  PREMIUM_UNLIMITED_AMOUNT_INR: 1899,
  PREMIUM_UNLIMITED_MONTHS: 1,
  PREMIUM_AMOUNT_INR: 1899,
  PREMIUM_CONTACT_PHONE: "8184046618",
  SUPPORT_EMAIL: "raviranjan.amu@gmail.com",
  SUPPORT_WHATSAPP_MESSAGE: "Hi, I need support with Saptarishi.",
  SUPPORT_EMAIL_SUBJECT: "Saptarishi support",
  SUPPORT_EMAIL_BODY: "Hi,\n\nI need help with Saptarishi.\n\n",
  PREMIUM_SCANNER_IMAGE: _DEPLOY_PREFIX + "/frontend/images/RaviRanjanScanner.png",

  // --- UI messages / display ---
  KUNDALI_READY_STATUS_MESSAGE:
    "Kundali Chart prepared and planet/nakshtra table is also ready",
  AUSPICIOUS_READY_STATUS_MESSAGE:
    "Top auspicious date and time slots are ready",
  /** Fixed shade for Status In Rashi / Nakshatra cells (not tied to planet strength %). */
  PLANET_STATUS_COLOR_INTENSITY: 0.72,

  // --- Astrology reference data ---
  /** Sign order for number 1–12 (sync with backend/utils/constant.py RASHI_IN_ENG). */
  RASHI_IN_EN: [
    "aries",
    "taurus",
    "gemini",
    "cancer",
    "leo",
    "virgo",
    "libra",
    "scorpio",
    "sagittarius",
    "capricorn",
    "aquarius",
    "pisces"
  ],
  RASHI_IN_SANSKRIT: [
    "mesha",
    "vrishabha",
    "mithuna",
    "karka",
    "simha",
    "kanya",
    "tula",
    "vrishchika",
    "dhanu",
    "makara",
    "kumbha",
    "meena"
  ],
  /** Sign lord per rashi index (sync with backend/utils/constant.py RASHI_SIGN_LORD_IN_ENG). */
  RASHI_SIGN_LORD_IN_EN: [
    "mars",
    "venus",
    "mercury",
    "moon",
    "sun",
    "mercury",
    "venus",
    "mars",
    "jupiter",
    "saturn",
    "saturn",
    "jupiter"
  ],
  /** Chart labels from output JSON ``planets[].name`` (keep in sync with backend/utils/constant.py). */
  PLANET_SHORT: {
    sun: "Su",
    moon: "Mo",
    mars: "Ma",
    mercury: "Me",
    jupiter: "Ju",
    venus: "Ve",
    saturn: "Sa",
    rahu: "Ra",
    ketu: "Ke"
  },
  /** North Indian layout: houses 1–12 anticlockwise — sync with backend/utils/constant.py */
  NORTH_INDIAN_HOUSE_REGIONS: [
    [1, "", 50, 14],
    [2, "", 26, 12],
    [3, "", 12, 27],
    [4, "", 12, 54],
    [5, "", 12, 72],
    [6, "", 30, 88],
    [7, "", 50, 88],
    [8, "", 70, 88],
    [9, "", 88, 72],
    [10, "", 88, 54],
    [11, "", 88, 27],
    [12, "", 74, 12]
  ],
  /** Display order for planet abbreviations in each house cell */
  PLANET_DISPLAY_ORDER: ["sun", "moon", "mars", "mercury", "jupiter", "venus", "saturn", "rahu", "ketu"],
  /** Vimshottari order for ``aspected_by`` column (sync with backend/utils/constant.py). */
  VIMSHOTTARI_PLANET_ORDER: [
    "ketu",
    "venus",
    "sun",
    "moon",
    "mars",
    "rahu",
    "jupiter",
    "saturn",
    "mercury"
  ],

  // --- Remedy page tables ---
  /** Planet Remedy table columns (sync with data.json planets[].remedy keys). */
  PLANET_REMEDY_COLUMNS: [
    { key: "planet", header: "Planet" },
    { key: "whom_to_worship", header: "Whom to worship" },
    { key: "day_to_fast", header: "Day to fast" },
    { key: "mantra_to_chant", header: "Mantra to chant" },
    { key: "things_to_donate", header: "things to donate" },
    { key: "whom_to_respect_most", header: "Whom to respect most" },
    { key: "what_to_wear_in_finger", header: "what to wear in finger" },
    { key: "feed_to_animal", header: "feed to animal" }
  ],
  /** Nakshatra remedy detail table headers (nava-tara panel). */
  REMEDY_NAKSHATRA_TABLE_HEADERS: [
    "Nakshatra",
    "Navatara",
    "Symbol",
    "Ruling Planet",
    "Deity",
    "Tree",
    "Directions",
    "Lunar Month",
    "Tithi",
    "Remedy",
    "Mantra",
    "Animal",
    "Colors",
    "Number",
    "Day",
    "Time"
  ],

  // --- Navatara rendering ---
  NAVATARA_INTENSITY: {
    "ati-maitri": 1,
    janma: 1,
    sadhaka: 0.85,
    sampat: 0.75,
    kshema: 0.7,
    maitri: 0.5,
    vipat: 0.75,
    pratyari: 0.65,
    vadha: 1
  }
};

/** Expose for scripts that read from window (e.g. common.js nav links). */
window.SAPTARISHI_CONSTANTS = SAPTARISHI_CONSTANTS;

