// Copyright © 2018-2026 ranjanravi.com. All rights reserved.

/** Shared UI constants (keep in sync with main/constant.py where applicable). */
const SAPTARISHI_CONSTANTS = {
  FLASK_PORT: 8081,
  /** Production API (Render). Local UI uses localhost:8081 instead. */
  PRODUCTION_API_ORIGIN: "https://saptarishi.ranjanravi.com",
  DEFAULT_HOUSE_SYSTEM: "W",
  API_KUNDALI_PATH: "/api/kundali",
  API_PLANET_DATABASE_PATH: "/api/planet-database",
  KUNDALI_READY_STATUS_MESSAGE:
    "Kundali Chart prepared and planet/nakshtra table is also ready",
  PLACE_CUSTOM_VALUE: "__custom__",
  MAX_PLACE_QUERY_LENGTH: 240,
  /**
   * Nava-tara helpfulness intensity (0–1) for row shading.
   * Ati-maitri & janma strongest; maitri moderate; harmful taras scale red depth.
   */
  /** Fixed shade for Status In Rashi / Nakshatra cells (not tied to planet strength %). */
  PLANET_STATUS_COLOR_INTENSITY: 0.72,
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
  },
  /** Sign order for number 1–12 (sync with main/constant.py RASHI_IN_ENG). */
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
  /** Sign lord per rashi index (sync with main/constant.py RASHI_SIGN_LORD_IN_ENG). */
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
  /** Parashari drishti offsets (sync with main/constant.py / data.json). */
  DEFAULT_PLANET_ASPECT_OFFSETS: {
    sun: [7],
    moon: [7],
    mercury: [7],
    venus: [7],
    mars: [4, 7, 8],
    jupiter: [5, 7, 9],
    saturn: [3, 7, 10],
    rahu: [5, 7, 9],
    ketu: []
  },
  /** Chart labels from output JSON ``planets[].name`` (keep in sync with main/constant.py). */
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
  /** North Indian layout: houses 1–12 anticlockwise — sync with main/constant.py */
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
  /** Vimshottari order for ``aspected_by`` column (sync with main/constant.py). */
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
  /** Fallback max for chart color scaling if API omits strength rules. */
  PLANET_STRENGTH_MAX_PERCENT: 200
};
