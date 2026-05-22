"""Minimal Flask API: one endpoint runs ``get_kundali.build_full_kundali`` and returns JSON."""

from __future__ import annotations

import json
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
    MAX_PLACE_QUERY_LENGTH,
    SERVICE_NAME,
    VALID_HOUSE_SYSTEMS,
)
from get_kundali import build_full_kundali  # noqa: E402

app = Flask(__name__)


@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    return response


@app.route("/", methods=["GET"])
def home():
    return jsonify(
        {
            "service": SERVICE_NAME,
            "ui": "/ui/kundali.html",
            "api": "/api/kundali?date=1990-05-15&time=14:30&place=New%20Delhi%2C%20India",
        }
    )


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


if __name__ == "__main__":
    app.run(host=FLASK_HOST, port=FLASK_PORT, debug=False)
