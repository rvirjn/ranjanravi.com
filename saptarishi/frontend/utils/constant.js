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
  /** Public site (privacy, emails, native app). */
  SITE_NAME: "Saptarishi",
  SITE_ORIGIN: "https://saptarishi.ranjanravi.com",
  OPERATOR_NAME: "ranjanravi.com",
  /** Public / app contact. Change these; support and phone aliases follow below. */
  CONTACT_EMAIL: "rv.saptarishi@gmail.com",
  CONTACT_PHONE: "8184046618",
  PRIVACY_LAST_UPDATED: "31 August 2026",
  CHILDREN_PRIVACY_MIN_AGE: 13,

  /** Birth-form place dropdown (kundali, remedy, auspicious, compare). */
  BIRTH_PLACE_PRESETS: [
    "New Delhi, India",
    "Mumbai, India",
    "Kolkata, India",
    "Bengaluru, India",
    "Patna, India",
    "Motihari, India"
  ],

  /** Form limits (keep in sync with backend/utils/constant.py). */
  MAX_NAME_LENGTH: 120,
  MAX_EMAIL_LENGTH: 240,
  MIN_PASSWORD_LENGTH: 4,
  EMAIL_PLACEHOLDER: "you@example.com",
  MOBILE_PLACEHOLDER: "e.g. 9876543210",
  NAME_PLACEHOLDER: "Enter name",
  FULL_NAME_PLACEHOLDER: "Your full name",
  PLACE_CUSTOM_PLACEHOLDER: "City, Country",

  KUNDALI_COMPARE_MIN_BIRTHS: 2,
  KUNDALI_COMPARE_MAX_BIRTHS: 5,
  COUPON_CODE_MIN_LENGTH: 4,
  COUPON_CODE_MAX_LENGTH: 32,
  WALLET_COUPON_PREFIX_BY_AMOUNT: {
    299: "WL29",
    500: "WL50",
    1899: "WL18"
  },

  // --- Frontend routes ---
  PAGE_FILE_TO_PATH: {
    "kundali.html": _DEPLOY_PREFIX + "/kundali",
    "auspicious.html": _DEPLOY_PREFIX + "/auspicious",
    "remedy.html": _DEPLOY_PREFIX + "/remedy",
    "profile.html": _DEPLOY_PREFIX + "/profile",
    "login.html": _DEPLOY_PREFIX + "/login",
    "privacy.html": _DEPLOY_PREFIX + "/privacy"
  },

  // --- API endpoints ---
  DEFAULT_HOUSE_SYSTEM: "W",
  API_KUNDALI_PATH: "/api/kundali",
  API_KUNDALI_COMPARE_PATH: "/api/kundali/compare",
  API_AUSPICIOUS_PATH: "/api/auspicious",
  API_ASK_PATH: "/api/ask",
  API_PLANET_DATABASE_PATH: "/api/planet-database?v=2",
  ASK_AI_MAX_QUESTION_LENGTH: 800,
  API_AUTH_REGISTER_PATH: "/api/auth/register",
  API_AUTH_LOGIN_PATH: "/api/auth/login",
  API_AUTH_PROFILE_PATH: "/api/auth/profile",
  API_AUTH_PROFILE_UPDATE_PATH: "/api/auth/profile/update",
  API_AUTH_PASSWORD_UPDATE_PATH: "/api/auth/password/update",
  API_AUTH_PASSWORD_FORGOT_PATH: "/api/auth/password/forgot",
  API_AUTH_ACCOUNT_DELETE_PATH: "/api/auth/account/delete",
  API_AUTH_BIRTH_VIEWS_PATH: "/api/auth/birth-views",
  API_AUTH_BIRTH_VIEWS_DELETE_PATH: "/api/auth/birth-views/delete",
  API_AUTH_LOGOUT_PATH: "/api/auth/logout",
  API_AUTH_ME_PATH: "/api/auth/me",
  API_SITE_VIEW_PATH: "/api/site/view",
  API_USAGE_PATH: "/api/usage",
  API_PREMIUM_INFO_PATH: "/api/premium/info",
  API_PREMIUM_ACTIVATE_PATH: "/api/premium/activate",
  API_WALLET_PATH: "/api/wallet",
  API_DB_USERS_PATH: "/api/db/users",
  API_DB_WALLET_PATH: "/api/db/wallet",
  API_DB_SEND_COUPON_PATH: "/api/db/send-coupon",
  USER_TYPE_ENDUSER: "enduser",
  USER_TYPE_ADMIN: "admin",

  // --- Usage / auth headers ---
  GUEST_ID_HEADER: "X-Guest-Id",
  MAX_FREE_QUERIES_PER_USER: 2,
  MAX_FREE_QUERIES_PER_GUEST: 2,
  PLACE_CUSTOM_VALUE: "__custom__",
  MAX_PLACE_QUERY_LENGTH: 240,

  // --- Premium / support ---
  PREMIUM_PACK_AMOUNT_INR: 299,
  PREMIUM_PACK_QUERY_LIMIT: 6,
  PREMIUM_UNLIMITED_AMOUNT_INR: 1899,
  PREMIUM_UNLIMITED_MONTHS: 1,
  PREMIUM_AMOUNT_INR: 1899,
  /** Per kundali/auspicious query when remedies are unlocked via wallet (not unlimited). */
  QUERY_CHARGE_INR: 51,
  SUPPORT_WHATSAPP_MESSAGE: "Hi, I need support with Saptarishi.",
  SUPPORT_EMAIL_SUBJECT: "Saptarishi support",
  SUPPORT_EMAIL_BODY: "Hi,\n\nI need help with Saptarishi.\n\n",
  PREMIUM_SCANNER_IMAGE: _DEPLOY_PREFIX + "/frontend/images/RaviRanjanScanner.png",

  // --- Wallet / astrologer (defaults; live values from data.json via GET /api/wallet) ---
  ASTROLOGER_NAME: "Ravi Ranjan",
  ASTROLOGER_CALL_RATE_INR_PER_MIN: 21,
  ASTROLOGER_ASK_RATE_INR_PER_MIN: 21,
  ASTROLOGER_MIN_BALANCE_INR: 21,
  WALLET_TOPUP_DEFAULTS: [
    { id: "wallet_299", amount_inr: 299, credit_inr: 299 },
    { id: "wallet_500", amount_inr: 500, credit_inr: 500 },
    { id: "wallet_1899", amount_inr: 1899, credit_inr: 1899 }
  ],

  // --- UI messages / display ---
  KUNDALI_READY_STATUS_MESSAGE:
    "Kundali Chart prepared and planet/nakshtra table is also ready",
  AUSPICIOUS_READY_STATUS_MESSAGE: "",
  /** Inclusive max span for From→To on auspicious scan (keep in sync with backend). */
  AUSPICIOUS_MAX_RANGE_DAYS: 365 * 2,
  /** Fixed shade for Status In Rashi / Nakshatra cells (not tied to planet strength %). */
  PLANET_STATUS_COLOR_INTENSITY: 0.72,

  /**
   * ``color_codes.column_name`` (display) → planets-table / UI key.
   * Keep in sync with backend/utils/constant.py COLOR_CODE_COLUMN_NAME_TO_KEY.
   */
  COLOR_CODE_COLUMN_NAME_TO_KEY: {
    planet_symbol_in_birth_chart: "planet_symbol_in_birth_chart",
    "planet strength": "strength",
    "mahadasha on age": "dasha_age",
    "rashi status": "planet_status_in_rashi",
    "nakshatra status": "planet_status_in_nakshatra",
    "nakshatra navatara": "navatara",
    karakwaqt: "karakwaqt",
    "malefic 6/8/12": "is_planet_in_6_8_12_house",
    "lagna lord enemy": "is_planet_lagna_lord_enemy",
    "death degree": "is_planet_at_death_degree",
    "lord comparison": "lord_comparison"
  },

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
    { key: "number_of_count_to_chant", header: "Chant count" },
    { key: "how_to_do_mantra_chant", header: "How to chant" },
    { key: "things_to_donate", header: "things to donate" },
    { key: "whom_to_respect_most", header: "Whom to respect most" },
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

SAPTARISHI_CONSTANTS.PREMIUM_CONTACT_PHONE = SAPTARISHI_CONSTANTS.CONTACT_PHONE;
SAPTARISHI_CONSTANTS.SUPPORT_EMAIL = SAPTARISHI_CONSTANTS.CONTACT_EMAIL;

/** Expose for scripts that read from window (e.g. common.js nav links). */
window.SAPTARISHI_CONSTANTS = SAPTARISHI_CONSTANTS;

