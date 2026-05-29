# Copyright © 2018-2026 ranjanravi.com. All rights reserved.
"""Flask API for Saptarishi kundali (Render production + local Docker)."""

from __future__ import annotations

import json
import os
import sys
from functools import wraps
from pathlib import Path
from typing import Any, Callable

from flask import Flask, g, jsonify, request

ROOT = Path(__file__).resolve().parents[2]
_PY_DIR = ROOT / "py"
if str(_PY_DIR) not in sys.path:
    sys.path.insert(0, str(_PY_DIR))

from auth import UserStore, normalize_mobile, parse_client_ip  # noqa: E402
from utils.constant import (  # noqa: E402
    AUTH_TOKEN_HEADER,
    AUTH_TOKEN_PREFIX,
    DEFAULT_HOUSE_SYSTEM,
    FLASK_HOST,
    FLASK_PORT,
    FLASK_PUBLIC_API_ORIGIN,
    GUEST_ID_HEADER,
    MAX_PLACE_QUERY_LENGTH,
    SERVICE_NAME,
    VALID_HOUSE_SYSTEMS,
)
from auspicious import build_full_auspicious  # noqa: E402
from kundali import EnrichKundali, build_full_kundali  # noqa: E402

app = Flask(__name__)
app.config["SECRET_KEY"] = os.environ.get(
    "SAPTARISHI_SECRET_KEY", "change-me-in-production-saptarishi"
)

LISTEN_PORT = int(os.environ.get("PORT", FLASK_PORT))
PUBLIC_API_ORIGIN = os.environ.get(
    "SAPTARISHI_PUBLIC_ORIGIN", FLASK_PUBLIC_API_ORIGIN
).rstrip("/")
IS_RENDER = os.environ.get("RENDER", "").lower() in {"true", "1", "yes"}

user_store = UserStore(ROOT)


def _validate_user_storage() -> None:
    try:
        from utils.googledrive import ensure_google_drive_deps, users_storage_backend

        if users_storage_backend() == "gdrive":
            ensure_google_drive_deps(install_if_missing=True)
    except Exception as exc:
        app.logger.warning("User storage startup check failed: %s", exc)


_validate_user_storage()


def _api_url(path: str, query: str = "") -> str:
    base = PUBLIC_API_ORIGIN + path
    return f"{base}?{query}" if query else base


def _extract_bearer_token() -> str:
    header = (request.headers.get(AUTH_TOKEN_HEADER) or "").strip()
    if header.startswith(AUTH_TOKEN_PREFIX):
        return header[len(AUTH_TOKEN_PREFIX) :].strip()
    return (request.args.get("token") or "").strip()


def _client_ip() -> str:
    return parse_client_ip(
        request.headers.get("X-Forwarded-For", ""),
        request.remote_addr or "",
        real_ip=request.headers.get("X-Real-IP", ""),
        cf_connecting_ip=request.headers.get("CF-Connecting-IP", ""),
        true_client_ip=request.headers.get("True-Client-IP", ""),
    )


def _usage_payload(user: dict[str, Any] | None = None, guest_id: str = "") -> dict[str, Any]:
    return user_store.usage_for_client(_client_ip(), user=user, guest_id=guest_id)


def _extract_guest_id() -> str:
    return (request.headers.get(GUEST_ID_HEADER) or request.args.get("guest_id") or "").strip()


def _resolve_logged_in_user() -> dict[str, Any] | None:
    token = _extract_bearer_token()
    if not token:
        return None
    return user_store.resolve_token(token)


def _limit_response(message: str) -> tuple[Any, int]:
    return jsonify({"error": message, "premium_required": True}), 403


@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = (
        "Content-Type, Authorization, X-Guest-Id"
    )
    return response


def require_login(view: Callable) -> Callable:
    @wraps(view)
    def wrapped(*args, **kwargs):
        if request.method == "OPTIONS":
            return view(*args, **kwargs)
        token = _extract_bearer_token()
        user = user_store.resolve_token(token)
        if not user:
            return jsonify({"error": "login required"}), 401
        g.current_user = user
        g.auth_token = token
        return view(*args, **kwargs)

    return wrapped


@app.route("/", methods=["GET"])
def home():
    from utils.googledrive import gdrive_credentials_configured, users_storage_backend

    sample = "date=1990-05-15&time=14:30&place=New%20Delhi%2C%20India&house_system=W"
    storage = users_storage_backend()
    return jsonify(
        {
            "service": SERVICE_NAME,
            "deployment": "render" if IS_RENDER else "local",
            "public_api_origin": PUBLIC_API_ORIGIN,
            "listen_port": LISTEN_PORT,
            "users_storage": storage,
            "gdrive_credentials_configured": gdrive_credentials_configured(),
            "view_count": user_store.get_view_count(),
            "ui": {
                "login": "/ui/html/login.html",
                "entry": "/ui/html/kundali.html",
                "auspicious": "/ui/html/auspicious.html",
            },
            "endpoints": {
                "register": _api_url("/api/auth/register"),
                "login": _api_url("/api/auth/login"),
                "kundali": _api_url("/api/kundali", sample),
                "auspicious": _api_url(
                    "/api/auspicious",
                    "date_from=2026-05-20&date_to=2026-06-20&place=Bengaluru%2C%20India",
                ),
                "planet_database": _api_url("/api/planet-database"),
            },
        }
    )


@app.route("/api/site/view", methods=["GET", "POST", "OPTIONS"], strict_slashes=False)
def api_site_view():
    if request.method == "OPTIONS":
        return "", 204
    if request.method == "GET":
        return jsonify({"view_count": user_store.get_view_count()})
    count = user_store.increment_view_count()
    return jsonify({"view_count": count})


@app.route("/api/auth/register", methods=["POST", "OPTIONS"], strict_slashes=False)
def api_auth_register():
    if request.method == "OPTIONS":
        return "", 204
    body = request.get_json(silent=True) or {}
    try:
        user_store.register(
            body.get("name", ""),
            body.get("mobile", ""),
            body.get("email", ""),
            body.get("password", ""),
        )
        _, token = user_store.login(body.get("mobile", ""), body.get("password", ""))
        data = user_store.load()
        user = user_store.find_user_by_mobile(data, normalize_mobile(body.get("mobile", "")))
        usage = _usage_payload(user=user) if user else _usage_payload()
        return jsonify(
            {
                "user": usage,
                "token": token,
                "usage": usage,
                "view_count": user_store.get_view_count(),
            }
        )
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except RuntimeError as e:
        return jsonify({"error": str(e)}), 503


@app.route("/api/auth/login", methods=["POST", "OPTIONS"], strict_slashes=False)
def api_auth_login():
    if request.method == "OPTIONS":
        return "", 204
    body = request.get_json(silent=True) or {}
    try:
        public_user, token = user_store.login(
            body.get("mobile", ""),
            body.get("password", ""),
        )
        usage = _usage_payload(user=public_user)
        return jsonify(
            {
                "user": usage,
                "token": token,
                "usage": usage,
                "view_count": user_store.get_view_count(),
            }
        )
    except ValueError as e:
        return jsonify({"error": str(e)}), 401
    except RuntimeError as e:
        return jsonify({"error": str(e)}), 503


@app.route("/api/auth/logout", methods=["POST", "OPTIONS"], strict_slashes=False)
@require_login
def api_auth_logout():
    if request.method == "OPTIONS":
        return "", 204
    user_store.logout(getattr(g, "auth_token", ""))
    return jsonify({"ok": True})


@app.route("/api/auth/me", methods=["GET", "OPTIONS"], strict_slashes=False)
@require_login
def api_auth_me():
    if request.method == "OPTIONS":
        return "", 204
    usage = _usage_payload(user=g.current_user)
    view_count = int(user_store.load().get("site", {}).get("view_count") or 0)
    return jsonify(
        {
            "user": usage,
            "usage": usage,
            "view_count": view_count,
        }
    )


@app.route("/api/usage", methods=["GET", "OPTIONS"], strict_slashes=False)
def api_usage():
    if request.method == "OPTIONS":
        return "", 204
    user = _resolve_logged_in_user()
    if user:
        usage = _usage_payload(user=user)
        return jsonify({"usage": usage, "user": usage})
    try:
        guest_id = UserStore.normalize_guest_id(_extract_guest_id())
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    usage = _usage_payload(guest_id=guest_id)
    return jsonify({"usage": usage, "user": None})


@app.route("/api/premium/info", methods=["GET", "OPTIONS"], strict_slashes=False)
def api_premium_info():
    if request.method == "OPTIONS":
        return "", 204
    try:
        return jsonify(user_store.premium_info_for_client())
    except ValueError as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/premium/activate", methods=["POST", "OPTIONS"], strict_slashes=False)
@require_login
def api_premium_activate():
    if request.method == "OPTIONS":
        return "", 204
    body = request.get_json(silent=True) or {}
    try:
        user_store.activate_premium(
            g.current_user["id"],
            body.get("coupon_code", body.get("transaction_ref", "")),
        )
        data = user_store.load()
        user = user_store.find_user_by_id(data, g.current_user["id"])
        usage = _usage_payload(user=user)
        return jsonify(
            {
                "ok": True,
                "user": usage,
                "usage": usage,
                "message": "Premium activated. You now have unlimited kundali and auspicious scans.",
            }
        )
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except RuntimeError as e:
        return jsonify({"error": str(e)}), 503


@app.route("/api/planet-database", methods=["GET"], strict_slashes=False)
def api_planet_database():
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
        client_ip = _client_ip()
        user = _resolve_logged_in_user()
        guest_id = ""
        if not user:
            guest_id = UserStore.normalize_guest_id(_extract_guest_id())

        payload = build_full_kundali(ROOT, date_s, time_s, place, house_system)

        usage = user_store.record_kundali_for_ip(
            client_ip,
            user=user,
            guest_id=guest_id,
        )
        payload["usage"] = usage
        payload["user"] = usage if user else None
        return jsonify(payload)
    except ValueError as e:
        msg = str(e)
        if "limit reached" in msg.lower():
            return _limit_response(msg)
        return jsonify({"error": msg}), 400
    except (RuntimeError, json.JSONDecodeError) as e:
        return jsonify({"error": str(e)}), 500
    except OSError as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/auspicious", methods=["GET"], strict_slashes=False)
def api_auspicious():
    date_from = (request.args.get("date_from") or request.args.get("from") or "").strip()
    date_to = (request.args.get("date_to") or request.args.get("to") or "").strip()
    place = (request.args.get("place") or "").strip()
    house_system = (request.args.get("house_system") or DEFAULT_HOUSE_SYSTEM).strip().upper()
    if not date_from or not date_to or not place:
        return jsonify({"error": "date_from, date_to, and place are required"}), 400
    if len(place) > MAX_PLACE_QUERY_LENGTH:
        return jsonify({"error": "place is too long"}), 400
    if house_system not in VALID_HOUSE_SYSTEMS:
        return jsonify({"error": f"house_system must be one of {', '.join(VALID_HOUSE_SYSTEMS)}"}), 400
    try:
        client_ip = _client_ip()
        user = _resolve_logged_in_user()
        guest_id = ""
        if not user:
            guest_id = UserStore.normalize_guest_id(_extract_guest_id())

        payload = build_full_auspicious(ROOT, date_from, date_to, place, house_system)

        usage = user_store.record_auspicious_for_ip(
            client_ip,
            user=user,
            guest_id=guest_id,
        )
        payload["usage"] = usage
        payload["user"] = usage if user else None
        return jsonify(payload)
    except ValueError as e:
        msg = str(e)
        if "limit reached" in msg.lower():
            return _limit_response(msg)
        return jsonify({"error": msg}), 400
    except (RuntimeError, OSError) as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(host=FLASK_HOST, port=LISTEN_PORT, debug=False)
