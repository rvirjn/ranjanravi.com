# Copyright © 2018-2026 ranjanravi.com. All rights reserved.
"""User registration, login, sessions, and usage limits (``database/users.json``)."""

from __future__ import annotations

import copy
import hashlib
import ipaddress
import json
import os
import re
import secrets
import threading
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Callable

try:
    from flask import g, has_request_context
except ImportError:  # pragma: no cover - CLI without Flask

    def has_request_context() -> bool:  # type: ignore[misc]
        return False

    g = None  # type: ignore[assignment]

from utils.constant import (
    BIRTH_VIEWS_MAX,
    GUEST_ID_MAX_LENGTH,
    GUESTS_MAX,
    MAX_AUSPICIOUS_PER_GUEST,
    MAX_AUSPICIOUS_PER_IP,
    MAX_AUSPICIOUS_PER_USER,
    MAX_KUNDALI_PER_GUEST,
    MAX_KUNDALI_PER_IP,
    MAX_KUNDALI_PER_USER,
    MIN_PASSWORD_LENGTH,
    MOBILE_DIGITS_MAX,
    MOBILE_DIGITS_MIN,
    PREMIUM_AMOUNT_INR,
    PREMIUM_CONTACT_PHONE,
    SESSION_TTL_DAYS,
    SESSIONS_MAX_PER_USER,
    SITE_VIEW_BATCH_SIZE,
    USERS_JSON_REL_PATH,
    USAGE_BY_IP_MAX,
)


def _parse_ip_token(value: str) -> str | None:
    token = str(value or "").strip()
    if not token:
        return None
    if token.lower().startswith("unknown"):
        return None
    if token.startswith("[") and "]" in token:
        token = token[1 : token.index("]")]
    # IPv4 with port (e.g. 203.0.113.1:12345)
    if token.count(":") == 1 and "." in token:
        host, maybe_port = token.rsplit(":", 1)
        if maybe_port.isdigit():
            token = host
    return token or None


def is_public_ip(ip: str) -> bool:
    try:
        addr = ipaddress.ip_address(ip)
    except ValueError:
        return False
    return not (
        addr.is_private
        or addr.is_loopback
        or addr.is_link_local
        or addr.is_reserved
        or addr.is_multicast
    )


def parse_client_ip(
    forwarded_for: str,
    remote_addr: str,
    *,
    real_ip: str = "",
    cf_connecting_ip: str = "",
    true_client_ip: str = "",
) -> str:
    """Prefer the visitor's public IP from proxy headers (not Docker gateway 172.x)."""
    candidates: list[str] = []
    for header in (true_client_ip, cf_connecting_ip, real_ip, forwarded_for):
        for part in str(header or "").split(","):
            ip = _parse_ip_token(part)
            if ip:
                candidates.append(ip)

    remote = _parse_ip_token(remote_addr)
    if remote:
        candidates.append(remote)

    for ip in candidates:
        if is_public_ip(ip):
            return ip

    # Local Docker / direct LAN: no public IP visible — use last private or unknown
    if remote:
        return remote
    if candidates:
        return candidates[0]
    return "unknown"


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _iso_now() -> str:
    return _utc_now().isoformat()


def normalize_mobile(value: str) -> str:
    digits = re.sub(r"\D", "", str(value or ""))
    if len(digits) < MOBILE_DIGITS_MIN or len(digits) > MOBILE_DIGITS_MAX:
        raise ValueError(f"mobile must be {MOBILE_DIGITS_MIN}–{MOBILE_DIGITS_MAX} digits")
    return digits


def normalize_email(value: str) -> str:
    email = str(value or "").strip().lower()
    if not email or "@" not in email or len(email) > 240:
        raise ValueError("valid email is required")
    return email


def normalize_name(value: str) -> str:
    name = " ".join(str(value or "").strip().split())
    if len(name) < 2:
        raise ValueError("name is required")
    if len(name) > 120:
        raise ValueError("name is too long")
    return name


def hash_password(password: str) -> str:
    text = str(password or "")
    if len(text) < MIN_PASSWORD_LENGTH:
        raise ValueError(f"password must be at least {MIN_PASSWORD_LENGTH} characters")
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", text.encode("utf-8"), salt.encode("utf-8"), 120_000)
    return f"{salt}${digest.hex()}"


def verify_password(password: str, stored_hash: str) -> bool:
    try:
        salt, hex_digest = str(stored_hash or "").split("$", 1)
        digest = hashlib.pbkdf2_hmac(
            "sha256", str(password or "").encode("utf-8"), salt.encode("utf-8"), 120_000
        )
        return secrets.compare_digest(digest.hex(), hex_digest)
    except (ValueError, AttributeError):
        return False


class UserStore:
    """Read/write user DB (Google Drive when configured, else ``database/users.json``)."""

    _io_lock = threading.Lock()
    _cache_data: dict[str, Any] | None = None
    _cache_at: float = 0.0

    def __init__(self, project_root: Path) -> None:
        self.root = project_root
        self.path = project_root / USERS_JSON_REL_PATH
        self._pending_view_bumps = 0

    @staticmethod
    def _cache_ttl_seconds() -> float:
        raw = os.environ.get("SAPTARISHI_USERS_CACHE_SECONDS", "5")
        try:
            return max(0.0, float(raw))
        except ValueError:
            return 15.0

    def _cache_get_copy(self) -> dict[str, Any] | None:
        if not self._uses_gdrive():
            return None
        ttl = self._cache_ttl_seconds()
        if ttl <= 0 or self._cache_data is None:
            return None
        if time.monotonic() - self._cache_at > ttl:
            return None
        return copy.deepcopy(self._cache_data)

    def _cache_store(self, data: dict[str, Any]) -> None:
        if self._uses_gdrive():
            self._cache_data = copy.deepcopy(self._normalize_db(data))
            self._cache_at = time.monotonic()

    def _cache_invalidate(self) -> None:
        self._cache_data = None
        self._cache_at = 0.0

    def _set_request_db(self, data: dict[str, Any]) -> None:
        if has_request_context():
            g._saptarishi_users_db = data  # type: ignore[attr-defined]

    def _get_request_db(self) -> dict[str, Any] | None:
        if has_request_context() and hasattr(g, "_saptarishi_users_db"):
            return g._saptarishi_users_db  # type: ignore[attr-defined]
        return None

    @staticmethod
    def _uses_gdrive() -> bool:
        from utils.googledrive import users_storage_backend

        return users_storage_backend() == "gdrive"

    def _default_db(self) -> dict[str, Any]:
        return {
            "site": {"view_count": 0},
            "sessions": {},
            "users": [],
            "guests": {},
            "usage_by_ip": {},
            "redeemed_coupons": {},
            "premium": {
                "amount_inr": PREMIUM_AMOUNT_INR,
                "contact_phone": PREMIUM_CONTACT_PHONE,
                "coupon_codes": ["RRPREMIUM01", "VEDIC499"],
            },
        }

    def _read_raw(self, *, force: bool = False) -> dict[str, Any]:
        if not force:
            cached = self._cache_get_copy()
            if cached is not None:
                return cached

        if self._uses_gdrive():
            from utils.googledrive import download_users_json_text

            try:
                text = download_users_json_text()
            except Exception as exc:
                raise RuntimeError("Failed to load users.json from Google Drive") from exc
            data = json.loads(text) if text.strip() else self._default_db()
        elif not self.path.is_file():
            data = self._default_db()
        else:
            text = self.path.read_text(encoding="utf-8")
            data = json.loads(text) if text.strip() else self._default_db()
        self._cache_store(data)
        return copy.deepcopy(data)

    @staticmethod
    def _parse_session_expires(session: dict[str, Any]) -> datetime | None:
        expires_raw = session.get("expires_at")
        try:
            expires = datetime.fromisoformat(str(expires_raw))
            if expires.tzinfo is None:
                expires = expires.replace(tzinfo=timezone.utc)
            return expires
        except (TypeError, ValueError):
            return None

    @staticmethod
    def _parse_session_created(session: dict[str, Any]) -> datetime:
        created_raw = session.get("created_at")
        try:
            created = datetime.fromisoformat(str(created_raw))
            if created.tzinfo is None:
                created = created.replace(tzinfo=timezone.utc)
            return created
        except (TypeError, ValueError):
            return datetime.min.replace(tzinfo=timezone.utc)

    @classmethod
    def _prune_sessions(cls, sessions: dict[str, Any]) -> dict[str, Any]:
        """Drop expired sessions and keep only the newest per user."""
        if not isinstance(sessions, dict):
            return {}
        now = _utc_now()
        active: dict[str, dict[str, Any]] = {}
        for token, session in sessions.items():
            if not isinstance(session, dict):
                continue
            expires = cls._parse_session_expires(session)
            if expires is None or now > expires:
                continue
            active[str(token)] = session

        by_user: dict[str, list[tuple[str, dict[str, Any]]]] = {}
        for token, session in active.items():
            uid = str(session.get("user_id") or "")
            by_user.setdefault(uid, []).append((token, session))

        kept: dict[str, dict[str, Any]] = {}
        for entries in by_user.values():
            entries.sort(key=lambda item: cls._parse_session_created(item[1]), reverse=True)
            for token, session in entries[:SESSIONS_MAX_PER_USER]:
                kept[token] = session
        return kept

    @staticmethod
    def _entry_activity_score(entry: dict[str, Any]) -> int:
        return int(entry.get("kundali_used") or 0) + int(entry.get("auspicious_used") or 0)

    @classmethod
    def _prune_map_by_activity(
        cls,
        items: dict[str, Any],
        *,
        max_entries: int,
    ) -> dict[str, Any]:
        if max_entries <= 0 or len(items) <= max_entries:
            return items
        ranked = sorted(
            items.items(),
            key=lambda pair: cls._entry_activity_score(pair[1])
            if isinstance(pair[1], dict)
            else 0,
            reverse=True,
        )
        kept: dict[str, Any] = {}
        for key, value in ranked[:max_entries]:
            if isinstance(value, dict):
                kept[str(key)] = value
        return kept

    @staticmethod
    def _normalize_db(data: dict[str, Any]) -> dict[str, Any]:
        data.setdefault("site", {"view_count": 0})
        data.setdefault("sessions", {})
        data.setdefault("users", [])
        data.setdefault("guests", {})
        data.setdefault("usage_by_ip", {})
        data.setdefault("redeemed_coupons", {})
        premium = data.get("premium")
        if not isinstance(premium, dict):
            data["premium"] = {
                "amount_inr": PREMIUM_AMOUNT_INR,
                "contact_phone": PREMIUM_CONTACT_PHONE,
                "coupon_codes": [],
            }
        else:
            premium.setdefault("amount_inr", PREMIUM_AMOUNT_INR)
            premium.setdefault("contact_phone", PREMIUM_CONTACT_PHONE)
            premium.setdefault("coupon_codes", [])
        sessions = data.get("sessions")
        if isinstance(sessions, dict):
            data["sessions"] = UserStore._prune_sessions(sessions)
        guests = data.get("guests")
        if isinstance(guests, dict):
            data["guests"] = UserStore._prune_map_by_activity(guests, max_entries=GUESTS_MAX)
        usage_by_ip = data.get("usage_by_ip")
        if isinstance(usage_by_ip, dict):
            data["usage_by_ip"] = UserStore._prune_map_by_activity(
                usage_by_ip,
                max_entries=USAGE_BY_IP_MAX,
            )
        return data

    @staticmethod
    def _merge_usage_stats(local: dict[str, Any], remote: dict[str, Any]) -> dict[str, Any]:
        """Keep the highest usage counters when merging concurrent writes."""
        merged = {**remote, **local}
        merged["kundali_used"] = max(
            int(local.get("kundali_used") or 0),
            int(remote.get("kundali_used") or 0),
        )
        merged["auspicious_used"] = max(
            int(local.get("auspicious_used") or 0),
            int(remote.get("auspicious_used") or 0),
        )
        if local.get("_bootstrapped") or remote.get("_bootstrapped"):
            merged["_bootstrapped"] = True
        return merged

    @classmethod
    def _merge_user_entry(cls, local: dict[str, Any], remote: dict[str, Any]) -> dict[str, Any]:
        merged = cls._merge_usage_stats(local, remote)
        if local.get("password_hash"):
            merged["password_hash"] = local["password_hash"]
        if local.get("mobile"):
            merged["mobile"] = local["mobile"]
        if local.get("email"):
            merged["email"] = local["email"]
        if local.get("name"):
            merged["name"] = local["name"]
        if local.get("is_premium"):
            merged["is_premium"] = True
        for key in ("premium_activated_at", "premium_coupon_code", "premium_amount_inr"):
            if local.get(key) is not None:
                merged[key] = local[key]
        merged["birth_views"] = UserStore._merge_birth_views(
            local.get("birth_views"),
            remote.get("birth_views"),
        )
        return merged

    @staticmethod
    def _merge_birth_views(
        local_views: Any,
        remote_views: Any,
    ) -> list[str]:
        out: list[str] = []
        seen: set[str] = set()
        for src in (local_views, remote_views):
            if not isinstance(src, list):
                continue
            for item in src:
                label = str(item or "").strip()
                if not label or label in seen:
                    continue
                seen.add(label)
                out.append(label)
        if len(out) > BIRTH_VIEWS_MAX:
            out = out[-BIRTH_VIEWS_MAX:]
        return out

    @staticmethod
    def _append_birth_view(
        user: dict[str, Any],
        birth_date: str,
        birth_time: str,
        birth_place: str = "",
    ) -> None:
        from utils.util import format_birth_view

        label = format_birth_view(birth_date, birth_time, birth_place)
        if not label:
            return
        views = user.get("birth_views")
        if not isinstance(views, list):
            views = []
        views.append(label)
        if len(views) > BIRTH_VIEWS_MAX:
            views = views[-BIRTH_VIEWS_MAX:]
        user["birth_views"] = views

    @classmethod
    def _merge_map_by_key(
        cls,
        local_map: dict[str, Any],
        remote_map: dict[str, Any],
        *,
        merge_entry: Callable[[dict[str, Any], dict[str, Any]], dict[str, Any]],
    ) -> dict[str, Any]:
        merged: dict[str, Any] = {}
        for key in set(local_map) | set(remote_map):
            local_val = local_map.get(key)
            remote_val = remote_map.get(key)
            if isinstance(local_val, dict) and isinstance(remote_val, dict):
                merged[key] = merge_entry(local_val, remote_val)
            elif isinstance(local_val, dict):
                merged[key] = dict(local_val)
            elif isinstance(remote_val, dict):
                merged[key] = dict(remote_val)
        return merged

    @classmethod
    def _merge_db(cls, into: dict[str, Any], fresh: dict[str, Any]) -> None:
        """Merge concurrent Drive writes without lowering usage counts."""
        into_sessions = into.setdefault("sessions", {})
        fresh_sessions = fresh.get("sessions") or {}
        if isinstance(fresh_sessions, dict):
            into_sessions.update(fresh_sessions)
            into["sessions"] = {**fresh_sessions, **into_sessions}

        users_by_id: dict[str, dict[str, Any]] = {}
        for user in list(fresh.get("users") or []) + list(into.get("users") or []):
            if not isinstance(user, dict) or not user.get("id"):
                continue
            uid = str(user["id"])
            if uid in users_by_id:
                users_by_id[uid] = cls._merge_user_entry(users_by_id[uid], user)
            else:
                users_by_id[uid] = dict(user)
        into["users"] = list(users_by_id.values())

        into["guests"] = cls._merge_map_by_key(
            into.get("guests") or {},
            fresh.get("guests") or {},
            merge_entry=cls._merge_usage_stats,
        )

        def merge_ip(local: dict[str, Any], remote: dict[str, Any]) -> dict[str, Any]:
            merged = cls._merge_usage_stats(local, remote)
            merged["ip"] = local.get("ip") or remote.get("ip")
            return merged

        into["usage_by_ip"] = cls._merge_map_by_key(
            into.get("usage_by_ip") or {},
            fresh.get("usage_by_ip") or {},
            merge_entry=merge_ip,
        )

        into_site = into.setdefault("site", {})
        fresh_site = fresh.get("site") if isinstance(fresh.get("site"), dict) else {}
        into_site["view_count"] = max(
            int(into_site.get("view_count") or 0),
            int(fresh_site.get("view_count") or 0),
        )

        into_redeemed = into.setdefault("redeemed_coupons", {})
        fresh_redeemed = fresh.get("redeemed_coupons")
        if isinstance(fresh_redeemed, dict):
            for code, entry in fresh_redeemed.items():
                if code not in into_redeemed:
                    into_redeemed[code] = entry

        cls._merge_premium_block(into, fresh)

    @staticmethod
    def _merge_premium_block(into: dict[str, Any], fresh: dict[str, Any]) -> None:
        into_premium = into.setdefault("premium", {})
        fresh_premium = fresh.get("premium") if isinstance(fresh.get("premium"), dict) else {}
        codes: set[str] = set()
        for src in (into_premium.get("coupon_codes"), fresh_premium.get("coupon_codes")):
            if isinstance(src, list):
                for item in src:
                    code = UserStore._normalize_coupon_code(str(item))
                    if code:
                        codes.add(code)
        into_premium["coupon_codes"] = sorted(codes)
        amount = into_premium.get("amount_inr")
        if amount in (None, ""):
            amount = fresh_premium.get("amount_inr", PREMIUM_AMOUNT_INR)
        try:
            into_premium["amount_inr"] = int(amount)
        except (TypeError, ValueError):
            into_premium["amount_inr"] = PREMIUM_AMOUNT_INR
        phone = str(into_premium.get("contact_phone") or fresh_premium.get("contact_phone") or "").strip()
        into_premium["contact_phone"] = phone or PREMIUM_CONTACT_PHONE

    @staticmethod
    def _normalize_coupon_code(value: str) -> str:
        return re.sub(r"\s+", "", str(value or "").strip()).upper()

    @classmethod
    def _parse_premium_config(cls, db: dict[str, Any]) -> dict[str, Any]:
        premium = db.get("premium")
        if not isinstance(premium, dict):
            raise ValueError("premium settings missing in users.json")
        raw_codes = premium.get("coupon_codes")
        if not isinstance(raw_codes, list) or not raw_codes:
            raise ValueError("premium.coupon_codes missing in users.json")
        codes: set[str] = set()
        for item in raw_codes:
            code = cls._normalize_coupon_code(str(item))
            if code:
                codes.add(code)
        if not codes:
            raise ValueError("premium.coupon_codes missing in users.json")
        amount = premium.get("amount_inr", PREMIUM_AMOUNT_INR)
        try:
            amount_inr = int(amount)
        except (TypeError, ValueError):
            amount_inr = PREMIUM_AMOUNT_INR
        phone = str(premium.get("contact_phone") or PREMIUM_CONTACT_PHONE).strip()
        return {
            "amount_inr": amount_inr,
            "contact_phone": phone or PREMIUM_CONTACT_PHONE,
            "coupon_codes": codes,
        }

    def _load_premium_config(self, db: dict[str, Any] | None = None) -> dict[str, Any]:
        data = self._normalize_db(db if db is not None else self.load())
        return self._parse_premium_config(data)

    def premium_info_for_client(self) -> dict[str, Any]:
        premium = self._load_premium_config()
        return {
            "amount_inr": premium["amount_inr"],
            "currency": "INR",
            "contact_phone": premium["contact_phone"],
        }

    def load(self) -> dict[str, Any]:
        request_db = self._get_request_db()
        if request_db is not None:
            return request_db
        with self._io_lock:
            data = self._normalize_db(self._read_raw())
            self._set_request_db(data)
            return data

    def _write_raw(self, data: dict[str, Any]) -> None:
        payload = self._normalize_db(data)
        if self._uses_gdrive():
            from utils.googledrive import update_users_json

            try:
                update_users_json(payload)
            except Exception as exc:
                raise RuntimeError("Failed to save users.json to Google Drive") from exc
            self._cache_store(payload)
            self._set_request_db(copy.deepcopy(payload))
            return
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.path.write_text(
            json.dumps(payload, indent=2, ensure_ascii=False) + "\n",
            encoding="utf-8",
        )
        self._set_request_db(copy.deepcopy(payload))

    def _mutate(self, mutator: Callable[[dict[str, Any]], None]) -> dict[str, Any]:
        with self._io_lock:
            self._cache_invalidate()
            if has_request_context() and hasattr(g, "_saptarishi_users_db"):
                delattr(g, "_saptarishi_users_db")
            data = self._normalize_db(self._read_raw())
            mutator(data)
            if self._uses_gdrive():
                try:
                    fresh = self._normalize_db(self._read_raw(force=True))
                    self._merge_db(data, fresh)
                except Exception:
                    pass
            self._write_raw(data)
            return data

    def find_ip_record(self, data: dict[str, Any], client_ip: str) -> dict[str, Any] | None:
        record = (data.get("usage_by_ip") or {}).get(client_ip)
        return record if isinstance(record, dict) else None

    def get_or_create_ip_record(self, data: dict[str, Any], client_ip: str) -> dict[str, Any]:
        ip = str(client_ip or "").strip() or "unknown"
        by_ip = data.setdefault("usage_by_ip", {})
        record = by_ip.get(ip)
        if not isinstance(record, dict):
            record = {
                "ip": ip,
                "created_at": _iso_now(),
                "kundali_used": 0,
                "auspicious_used": 0,
            }
            by_ip[ip] = record
        return record

    def _aggregate_usage_counts(
        self,
        data: dict[str, Any],
        ip_record: dict[str, Any],
        *,
        user: dict[str, Any] | None = None,
        guest_id: str = "",
    ) -> tuple[int, int]:
        """Max usage across IP, guest id, and account (IP may change between requests)."""
        k = int(ip_record.get("kundali_used") or 0)
        a = int(ip_record.get("auspicious_used") or 0)
        if guest_id:
            guest = self.find_guest(data, guest_id)
            if guest:
                k = max(k, int(guest.get("kundali_used") or 0))
                a = max(a, int(guest.get("auspicious_used") or 0))
        if user:
            k = max(k, int(user.get("kundali_used") or 0))
            a = max(a, int(user.get("auspicious_used") or 0))
        return k, a

    def _bootstrap_ip_from_legacy(
        self,
        data: dict[str, Any],
        ip_record: dict[str, Any],
        *,
        user: dict[str, Any] | None = None,
        guest_id: str = "",
    ) -> bool:
        """Once per IP, carry over prior guest/account counters so limits are not reset."""
        if ip_record.get("_bootstrapped"):
            return False
        k = int(ip_record.get("kundali_used") or 0)
        a = int(ip_record.get("auspicious_used") or 0)
        if guest_id:
            guest = self.find_guest(data, guest_id)
            if guest:
                k = max(k, int(guest.get("kundali_used") or 0))
                a = max(a, int(guest.get("auspicious_used") or 0))
        if user:
            k = max(k, int(user.get("kundali_used") or 0))
            a = max(a, int(user.get("auspicious_used") or 0))
        ip_record["kundali_used"] = k
        ip_record["auspicious_used"] = a
        ip_record["_bootstrapped"] = True
        return True

    def _sync_ip_usage_to_guest(self, data: dict[str, Any], ip_record: dict[str, Any], guest_id: str) -> None:
        if not guest_id:
            return
        guest = self.get_or_create_guest(data, guest_id)
        guest["kundali_used"] = int(ip_record.get("kundali_used") or 0)
        guest["auspicious_used"] = int(ip_record.get("auspicious_used") or 0)

    def _sync_ip_usage_to_user(self, data: dict[str, Any], ip_record: dict[str, Any], user: dict[str, Any]) -> None:
        user["kundali_used"] = int(ip_record.get("kundali_used") or 0)
        user["auspicious_used"] = int(ip_record.get("auspicious_used") or 0)

    @staticmethod
    def is_premium(user: dict[str, Any] | None) -> bool:
        if not isinstance(user, dict):
            return False
        return bool(user.get("is_premium"))

    @staticmethod
    def _premium_usage_fields(user: dict[str, Any] | None) -> dict[str, Any]:
        if not UserStore.is_premium(user):
            return {"is_premium": False}
        return {
            "is_premium": True,
            "kundali_limit": None,
            "auspicious_limit": None,
            "kundali_remaining": None,
            "auspicious_remaining": None,
        }

    def activate_premium(self, user_id: str, coupon_code: str) -> dict[str, Any]:
        """Mark account premium after coupon verification (codes in ``users.json``)."""
        code = self._normalize_coupon_code(coupon_code)
        if not code:
            raise ValueError("Enter your coupon code.")
        stored: dict[str, Any] = {}

        def apply(data: dict[str, Any]) -> None:
            premium = self._load_premium_config(data)
            if code not in premium["coupon_codes"]:
                raise ValueError(
                    "Invalid coupon code. Check the code sent to your email or phone."
                )
            user = self.find_user_by_id(data, user_id)
            if not user:
                raise ValueError("user not found")
            if self.is_premium(user):
                raise ValueError("Premium is already active on this account.")
            redeemed = data.setdefault("redeemed_coupons", {})
            if code in redeemed:
                raise ValueError("This coupon code has already been used.")
            redeemed[code] = {"user_id": user_id, "redeemed_at": _iso_now()}
            user["is_premium"] = True
            user["premium_activated_at"] = _iso_now()
            user["premium_coupon_code"] = code
            user["premium_amount_inr"] = premium["amount_inr"]
            stored.clear()
            stored.update(user)

        self._mutate(apply)
        return self.public_user(stored)

    @staticmethod
    def public_usage_from_ip(
        ip_record: dict[str, Any],
        *,
        is_guest: bool,
        user: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        k_used = int(ip_record.get("kundali_used") or 0)
        a_used = int(ip_record.get("auspicious_used") or 0)
        payload: dict[str, Any] = {
            "is_guest": is_guest,
            "kundali_used": k_used,
            "auspicious_used": a_used,
            "kundali_remaining": max(0, MAX_KUNDALI_PER_IP - k_used),
            "auspicious_remaining": max(0, MAX_AUSPICIOUS_PER_IP - a_used),
            "kundali_limit": MAX_KUNDALI_PER_IP,
            "auspicious_limit": MAX_AUSPICIOUS_PER_IP,
        }
        if user:
            payload.update(
                {
                    "id": user.get("id"),
                    "name": user.get("name"),
                    "mobile": user.get("mobile"),
                    "email": user.get("email"),
                    "is_guest": False,
                }
            )
            payload.update(UserStore._premium_usage_fields(user))
        return payload

    def usage_for_client(
        self,
        client_ip: str,
        *,
        user: dict[str, Any] | None = None,
        guest_id: str = "",
    ) -> dict[str, Any]:
        """Read-only usage snapshot for API responses (no Drive write)."""
        data = self.load()
        k, a = self._projected_usage(data, client_ip, user=user, guest_id=guest_id)
        return self.public_usage_from_ip(
            {"kundali_used": k, "auspicious_used": a},
            is_guest=user is None,
            user=user,
        )

    def _projected_usage(
        self,
        data: dict[str, Any],
        client_ip: str,
        *,
        user: dict[str, Any] | None = None,
        guest_id: str = "",
    ) -> tuple[int, int]:
        """Read-only usage counts from cached ``users.json`` (no Drive write)."""
        work = copy.deepcopy(data)
        ip_record = self.get_or_create_ip_record(work, client_ip)
        self._bootstrap_ip_from_legacy(work, ip_record, user=user, guest_id=guest_id)
        return self._aggregate_usage_counts(work, ip_record, user=user, guest_id=guest_id)

    def ensure_kundali_allowed(
        self,
        client_ip: str,
        *,
        user: dict[str, Any] | None = None,
        guest_id: str = "",
    ) -> None:
        if self.is_premium(user):
            return
        k, _ = self._projected_usage(
            self.load(), client_ip, user=user, guest_id=guest_id
        )
        if k >= MAX_KUNDALI_PER_IP:
            raise ValueError(
                f"Free kundali limit reached ({MAX_KUNDALI_PER_IP} scans used). "
                "Buy Premium for unlimited scans."
            )

    def ensure_auspicious_allowed(
        self,
        client_ip: str,
        *,
        user: dict[str, Any] | None = None,
        guest_id: str = "",
    ) -> None:
        if self.is_premium(user):
            return
        _, a = self._projected_usage(
            self.load(), client_ip, user=user, guest_id=guest_id
        )
        if a >= MAX_AUSPICIOUS_PER_IP:
            raise ValueError(
                f"Free auspicious limit reached ({MAX_AUSPICIOUS_PER_IP} scans used). "
                "Buy Premium for unlimited scans."
            )

    def check_ip_kundali_allowed(
        self, ip_record: dict[str, Any], user: dict[str, Any] | None = None
    ) -> None:
        if self.is_premium(user):
            return
        used = int(ip_record.get("kundali_used") or 0)
        if used >= MAX_KUNDALI_PER_IP:
            raise ValueError(
                f"Free kundali limit reached ({MAX_KUNDALI_PER_IP} scans used). "
                "Buy Premium for unlimited scans."
            )

    def check_ip_auspicious_allowed(
        self, ip_record: dict[str, Any], user: dict[str, Any] | None = None
    ) -> None:
        if self.is_premium(user):
            return
        used = int(ip_record.get("auspicious_used") or 0)
        if used >= MAX_AUSPICIOUS_PER_IP:
            raise ValueError(
                f"Free auspicious limit reached ({MAX_AUSPICIOUS_PER_IP} scans used). "
                "Buy Premium for unlimited scans."
            )

    def record_kundali_for_ip(
        self,
        client_ip: str,
        *,
        user: dict[str, Any] | None = None,
        guest_id: str = "",
        birth_date: str = "",
        birth_time: str = "",
        birth_place: str = "",
    ) -> dict[str, Any]:
        usage: dict[str, Any] = {}
        user_id = str(user.get("id") or "") if user else ""

        def apply(data: dict[str, Any]) -> None:
            ip_record = self.get_or_create_ip_record(data, client_ip)
            self._bootstrap_ip_from_legacy(data, ip_record, user=user, guest_id=guest_id)
            k, a = self._aggregate_usage_counts(data, ip_record, user=user, guest_id=guest_id)
            ip_record["kundali_used"] = k
            ip_record["auspicious_used"] = a
            self.check_ip_kundali_allowed(ip_record, user=user)
            ip_record["kundali_used"] = k + 1
            stored_user = self.find_user_by_id(data, user_id) if user_id else None
            if stored_user:
                self._sync_ip_usage_to_user(data, ip_record, stored_user)
                self._append_birth_view(stored_user, birth_date, birth_time, birth_place)
            elif guest_id:
                self._sync_ip_usage_to_guest(data, ip_record, guest_id)
            usage.update(
                self.public_usage_from_ip(
                    ip_record,
                    is_guest=stored_user is None,
                    user=stored_user,
                )
            )

        self._mutate(apply)
        return usage

    def record_auspicious_for_ip(
        self,
        client_ip: str,
        *,
        user: dict[str, Any] | None = None,
        guest_id: str = "",
    ) -> dict[str, Any]:
        usage: dict[str, Any] = {}

        def apply(data: dict[str, Any]) -> None:
            ip_record = self.get_or_create_ip_record(data, client_ip)
            self._bootstrap_ip_from_legacy(data, ip_record, user=user, guest_id=guest_id)
            k, a = self._aggregate_usage_counts(data, ip_record, user=user, guest_id=guest_id)
            ip_record["kundali_used"] = k
            ip_record["auspicious_used"] = a
            self.check_ip_auspicious_allowed(ip_record, user=user)
            ip_record["auspicious_used"] = a + 1
            if user:
                self._sync_ip_usage_to_user(data, ip_record, user)
            if guest_id:
                self._sync_ip_usage_to_guest(data, ip_record, guest_id)
            usage.update(self.public_usage_from_ip(ip_record, is_guest=user is None, user=user))

        self._mutate(apply)
        return usage

    @staticmethod
    def normalize_guest_id(value: str) -> str:
        guest_id = str(value or "").strip()
        if not guest_id or len(guest_id) > GUEST_ID_MAX_LENGTH:
            raise ValueError("guest id is required")
        if not re.fullmatch(r"[A-Za-z0-9_-]+", guest_id):
            raise ValueError("invalid guest id")
        return guest_id

    def find_guest(self, data: dict[str, Any], guest_id: str) -> dict[str, Any] | None:
        guest = (data.get("guests") or {}).get(guest_id)
        return guest if isinstance(guest, dict) else None

    def get_or_create_guest(self, data: dict[str, Any], guest_id: str) -> dict[str, Any]:
        guest_id_n = self.normalize_guest_id(guest_id)
        guests = data.setdefault("guests", {})
        guest = guests.get(guest_id_n)
        if not isinstance(guest, dict):
            guest = {
                "id": guest_id_n,
                "created_at": _iso_now(),
                "kundali_used": 0,
                "auspicious_used": 0,
            }
            guests[guest_id_n] = guest
        return guest

    @staticmethod
    def public_guest(guest: dict[str, Any]) -> dict[str, Any]:
        """Legacy guest view; prefer ``usage_for_client`` with IP."""
        k_used = int(guest.get("kundali_used") or 0)
        a_used = int(guest.get("auspicious_used") or 0)
        return {
            "is_guest": True,
            "id": guest.get("id"),
            "kundali_used": k_used,
            "auspicious_used": a_used,
            "kundali_remaining": max(0, MAX_KUNDALI_PER_IP - k_used),
            "auspicious_remaining": max(0, MAX_AUSPICIOUS_PER_IP - a_used),
            "kundali_limit": MAX_KUNDALI_PER_IP,
            "auspicious_limit": MAX_AUSPICIOUS_PER_IP,
        }

    def save(self, data: dict[str, Any]) -> None:
        with self._io_lock:
            self._cache_invalidate()
            if has_request_context() and hasattr(g, "_saptarishi_users_db"):
                delattr(g, "_saptarishi_users_db")
            payload = self._normalize_db(dict(data))
            if self._uses_gdrive():
                try:
                    fresh = self._normalize_db(self._read_raw(force=True))
                    self._merge_db(payload, fresh)
                except Exception:
                    pass
            self._write_raw(payload)

    def increment_view_count(self) -> int:
        with self._io_lock:
            self._pending_view_bumps += 1
            pending = self._pending_view_bumps
        if pending >= SITE_VIEW_BATCH_SIZE:
            self._flush_view_count()
            return self.get_view_count()
        return int(self.load().get("site", {}).get("view_count") or 0) + pending

    def _flush_view_count(self) -> None:
        with self._io_lock:
            bumps = self._pending_view_bumps
            if bumps <= 0:
                return
            self._pending_view_bumps = 0

        def apply(data: dict[str, Any]) -> None:
            site = data.setdefault("site", {})
            site["view_count"] = int(site.get("view_count") or 0) + bumps

        self._mutate(apply)

    def get_view_count(self) -> int:
        return int(self.load().get("site", {}).get("view_count") or 0)

    def find_user_by_mobile(self, data: dict[str, Any], mobile: str) -> dict[str, Any] | None:
        for user in data.get("users") or []:
            if isinstance(user, dict) and user.get("mobile") == mobile:
                return user
        return None

    def find_user_by_id(self, data: dict[str, Any], user_id: str) -> dict[str, Any] | None:
        for user in data.get("users") or []:
            if isinstance(user, dict) and user.get("id") == user_id:
                return user
        return None

    def register(self, name: str, mobile: str, email: str, password: str) -> dict[str, Any]:
        mobile_n = normalize_mobile(mobile)
        email_n = normalize_email(email)
        name_n = normalize_name(name)
        created: dict[str, Any] = {}

        def apply(data: dict[str, Any]) -> None:
            if self.find_user_by_mobile(data, mobile_n):
                raise ValueError("mobile number is already registered")
            for user in data.get("users") or []:
                if isinstance(user, dict) and str(user.get("email", "")).lower() == email_n:
                    raise ValueError("email is already registered")
            user = {
                "id": f"u_{secrets.token_hex(8)}",
                "mobile": mobile_n,
                "name": name_n,
                "email": email_n,
                "password_hash": hash_password(password),
                "created_at": _iso_now(),
                "kundali_used": 0,
                "auspicious_used": 0,
                "birth_views": [],
            }
            data.setdefault("users", []).append(user)
            created.clear()
            created.update(user)

        self._mutate(apply)
        return self.public_user(created)

    def login(self, mobile: str, password: str) -> tuple[dict[str, Any], str]:
        mobile_n = normalize_mobile(mobile)
        token = secrets.token_urlsafe(32)
        expires = (_utc_now() + timedelta(days=SESSION_TTL_DAYS)).isoformat()
        result: dict[str, Any] = {}

        def apply(data: dict[str, Any]) -> None:
            user = self.find_user_by_mobile(data, mobile_n)
            if not user or not verify_password(password, user.get("password_hash", "")):
                raise ValueError("invalid mobile or password")
            data.setdefault("sessions", {})[token] = {
                "user_id": user["id"],
                "expires_at": expires,
                "created_at": _iso_now(),
            }
            result["user"] = user

        self._mutate(apply)
        return self.public_user(result["user"]), token

    def logout(self, token: str) -> None:
        if not token:
            return

        def apply(data: dict[str, Any]) -> None:
            sessions = data.get("sessions") or {}
            if token in sessions:
                del sessions[token]

        self._mutate(apply)

    def compact_sessions(self) -> int:
        """Drop expired/excess sessions and persist the trimmed list."""
        removed = 0

        def apply(data: dict[str, Any]) -> None:
            nonlocal removed
            before = len(data.get("sessions") or {})
            data["sessions"] = self._prune_sessions(data.get("sessions") or {})
            removed = before - len(data["sessions"])

        self._mutate(apply)
        return removed

    def resolve_token(self, token: str) -> dict[str, Any] | None:
        if not token:
            return None
        data = self.load()
        session = (data.get("sessions") or {}).get(token)
        if not isinstance(session, dict):
            return None
        expires = self._parse_session_expires(session)
        if expires is None or _utc_now() > expires:
            self.logout(token)
            return None
        user = self.find_user_by_id(data, session.get("user_id", ""))
        if not user:
            return None
        return user

    @staticmethod
    def public_user(user: dict[str, Any]) -> dict[str, Any]:
        """Legacy account view; prefer ``usage_for_client`` with IP."""
        k_used = int(user.get("kundali_used") or 0)
        a_used = int(user.get("auspicious_used") or 0)
        payload: dict[str, Any] = {
            "is_guest": False,
            "id": user.get("id"),
            "name": user.get("name"),
            "mobile": user.get("mobile"),
            "email": user.get("email"),
            "kundali_used": k_used,
            "auspicious_used": a_used,
            "kundali_remaining": max(0, MAX_KUNDALI_PER_IP - k_used),
            "auspicious_remaining": max(0, MAX_AUSPICIOUS_PER_IP - a_used),
            "kundali_limit": MAX_KUNDALI_PER_IP,
            "auspicious_limit": MAX_AUSPICIOUS_PER_IP,
        }
        payload.update(UserStore._premium_usage_fields(user))
        return payload
