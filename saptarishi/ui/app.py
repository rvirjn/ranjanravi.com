import json
import subprocess
import sys
from pathlib import Path

from flask import Flask, jsonify, request


ROOT = Path(__file__).resolve().parents[1]
DB_PATH = ROOT / "database" / "nakshatra.json"

app = Flask(__name__)


def _load_all_nakshatras():
    with DB_PATH.open("r", encoding="utf-8") as file:
        data = json.load(file)
    return [item["nakshatra"] for item in data.get("nakshatras", [])]


def _output_path_for(nakshatra_name):
    slug = nakshatra_name.strip().lower().replace(" ", "_")
    return ROOT / "output" / ("chakras_{}.json".format(slug))


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
            "service": "saptarishi_flask_api",
            "ui_url": "http://localhost:9999/ui/hompage.html",
            "nakshatras_api": "/api/nakshatras",
            "chakras_api_example": "/api/chakras?nakshatra=rohini",
        }
    )


@app.route("/api/nakshatras", methods=["GET"])
def api_nakshatras():
    return jsonify(_load_all_nakshatras())


@app.route("/api/chakras", methods=["GET"])
def api_chakras():
    nakshatra = (request.args.get("nakshatra") or "").strip()
    if not nakshatra:
        return jsonify({"error": "nakshatra query param is required"}), 400

    command = [sys.executable, str(ROOT / "main" / "get_chakras.py"), nakshatra]
    result = subprocess.run(
        command,
        cwd=str(ROOT),
        capture_output=True,
        text=True,
        check=False,
    )
    if result.returncode != 0:
        return jsonify({"error": result.stdout.strip() or result.stderr.strip() or "failed"}), 400

    output_path = _output_path_for(nakshatra)
    if not output_path.exists():
        return jsonify({"error": "output file not generated"}), 500

    with output_path.open("r", encoding="utf-8") as file:
        payload = json.load(file)
    return jsonify(payload)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8081, debug=False)
