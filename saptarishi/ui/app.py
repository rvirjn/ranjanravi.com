# Copyright © 2018-2026 ranjanravi.com. All rights reserved.
"""Flask API for Saptarishi kundali (Render production + local Docker)."""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

from flask import Flask, jsonify, request

ROOT = Path(__file__).resolve().parents[1]
MAIN_DIR = ROOT / "main"
if str(MAIN_DIR) not in sys.path:
    sys.path.insert(0, str(MAIN_DIR))

from constant import (  # noqa: E402
    DEFAULT_HOUSE_SYSTEM,
    FLASK_HOST,
    FLASK_PORT,
    FLASK_PUBLIC_API_ORIGIN,
    MAX_PLACE_QUERY_LENGTH,
    SERVICE_NAME,
    VALID_HOUSE_SYSTEMS,
)
from get_kundali import EnrichKundali, build_full_kundali  # noqa: E402

app = Flask(__name__)

# Render sets PORT; local Docker uses 8081 (see Dockerfile.flask).
LISTEN_PORT = int(os.environ.get("PORT", FLASK_PORT))
PUBLIC_API_ORIGIN = os.environ.get(
    "SAPTARISHI_PUBLIC_ORIGIN", FLASK_PUBLIC_API_ORIGIN
).rstrip("/")
IS_RENDER = os.environ.get("RENDER", "").lower() in {"true", "1", "yes"}


def _api_url(path: str, query: str = "") -> str:
    base = PUBLIC_API_ORIGIN + path
    return f"{base}?{query}" if query else base


@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    return response


@app.route("/", methods=["GET"])
def home():
    sample = "date=1990-05-15&time=14:30&place=New%20Delhi%2C%20India&house_system=W"
    return jsonify(
        {
            "service": SERVICE_NAME,
            "deployment": "render" if IS_RENDER else "local",
            "public_api_origin": PUBLIC_API_ORIGIN,
            "listen_port": LISTEN_PORT,
            "ui": {
                "entry": "/ui/kundali.html",
                "note": "UI is static (nginx locally); Flask serves JSON API only on Render.",
            },
            "endpoints": {
                "kundali": _api_url("/api/kundali", sample),
                "planet_database": _api_url("/api/planet-database"),
            },
        }
    )


@app.route("/api/planet-database", methods=["GET"], strict_slashes=False)
def api_planet_database():
    """Return ``database/data.json`` (strength rules, planets, nakshatras, houses, …)."""
    try:
        return jsonify(EnrichKundali(ROOT).load_planet_database())
    except OSError as e:
        return jsonify({"error": str(e)}), 500
    except json.JSONDecodeError as e:
        return jsonify({"error": f"invalid JSON: {e}"}), 500


@app.route("/api/kundali", methods=["GET"], strict_slashes=False)
def api_kundali():
    date_s = (request.args.get("date") or "").strip()
    time_s = (request.args.get("time") or "").strip()
    place = (request.args.get("place") or "").strip()
    house_system = (request.args.get("house_system") or DEFAULT_HOUSE_SYSTEM).strip().upper()
    if not date_s or not time_s or not place:
        return jsonify({"error": "date, time, and place are required"}), 400
    if len(place) > MAX_PLACE_QUERY_LENGTH:
        return jsonify({"error": "place is too long"}), 400
    if house_system not in VALID_HOUSE_SYSTEMS:
        return jsonify({"error": f"house_system must be one of {', '.join(VALID_HOUSE_SYSTEMS)}"}), 400
    try:
        payload = build_full_kundali(ROOT, date_s, time_s, place, house_system)
        return jsonify(payload)
    except (RuntimeError, ValueError) as e:
        return jsonify({"error": str(e)}), 400
    except json.JSONDecodeError as e:
        return jsonify({"error": f"invalid JSON: {e}"}), 500
    except OSError as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(host=FLASK_HOST, port=LISTEN_PORT, debug=False)
