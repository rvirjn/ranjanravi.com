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
    GUEST_ID_MAX_LENGTH,
    MAX_AUSPICIOUS_PER_GUEST,
    MAX_AUSPICIOUS_PER_IP,
    MAX_AUSPICIOUS_PER_USER,
    MAX_KUNDALI_PER_GUEST,
    MAX_KUNDALI_PER_IP,
    MAX_KUNDALI_PER_USER,
    MIN_PASSWORD_LENGTH,
    MOBILE_DIGITS_MAX,
    MOBILE_DIGITS_MIN,
    SESSION_TTL_DAYS,
    USERS_JSON_REL_PATH,
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
        self.path = project_root / USERS_JSON_REL_PATH

    @staticmethod
    def _cache_ttl_seconds() -> float:
        raw = os.environ.get("SAPTARISHI_USERS_CACHE_SECONDS", "15")
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
    def _normalize_db(data: dict[str, Any]) -> dict[str, Any]:
        data.setdefault("site", {"view_count": 0})
        data.setdefault("sessions", {})
        data.setdefault("users", [])
        data.setdefault("guests", {})
        data.setdefault("usage_by_ip", {})
        return data

    @staticmethod
    def _merge_db(into: dict[str, Any], fresh: dict[str, Any]) -> None:
        """Merge concurrent Drive writes so sessions/users are not dropped."""
        into_sessions = into.setdefault("sessions", {})
        fresh_sessions = fresh.get("sessions") or {}
        if isinstance(fresh_sessions, dict):
            into_sessions.update(fresh_sessions)
            into["sessions"] = {**fresh_sessions, **into_sessions}

        users_by_id: dict[str, dict[str, Any]] = {}
        for user in fresh.get("users") or []:
            if isinstance(user, dict) and user.get("id"):
                users_by_id[str(user["id"])] = user
        for user in into.get("users") or []:
            if isinstance(user, dict) and user.get("id"):
                users_by_id[str(user["id"])] = user
        into["users"] = list(users_by_id.values())

        into_guests = into.setdefault("guests", {})
        fresh_guests = fresh.get("guests") or {}
        if isinstance(fresh_guests, dict):
            into_guests.update(fresh_guests)
            into["guests"] = {**fresh_guests, **into_guests}

        into_ip = into.setdefault("usage_by_ip", {})
        fresh_ip = fresh.get("usage_by_ip") or {}
        if isinstance(fresh_ip, dict):
            into_ip.update(fresh_ip)
            into["usage_by_ip"] = {**fresh_ip, **into_ip}

        into_site = into.setdefault("site", {})
        fresh_site = fresh.get("site") if isinstance(fresh.get("site"), dict) else {}
        into_site["view_count"] = max(
            int(into_site.get("view_count") or 0),
            int(fresh_site.get("view_count") or 0),
        )

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
            "ip": ip_record.get("ip"),
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
        return payload

    def usage_for_client(
        self,
        client_ip: str,
        *,
        user: dict[str, Any] | None = None,
        guest_id: str = "",
    ) -> dict[str, Any]:
        data = self.load()
        ip_key = str(client_ip or "").strip() or "unknown"
        dirty = ip_key not in (data.get("usage_by_ip") or {})
        ip_record = self.get_or_create_ip_record(data, client_ip)
        if self._bootstrap_ip_from_legacy(data, ip_record, user=user, guest_id=guest_id):
            dirty = True
        if dirty:
            self.save(data)
        return self.public_usage_from_ip(ip_record, is_guest=user is None, user=user)

    def check_ip_kundali_allowed(self, ip_record: dict[str, Any]) -> None:
        used = int(ip_record.get("kundali_used") or 0)
        if used >= MAX_KUNDALI_PER_IP:
            raise ValueError(
                f"kundali limit reached ({MAX_KUNDALI_PER_IP} per IP address). "
                "Logging in does not add more free uses. Contact support for premium."
            )

    def check_ip_auspicious_allowed(self, ip_record: dict[str, Any]) -> None:
        used = int(ip_record.get("auspicious_used") or 0)
        if used >= MAX_AUSPICIOUS_PER_IP:
            raise ValueError(
                f"auspicious scan limit reached ({MAX_AUSPICIOUS_PER_IP} per IP address). "
                "Logging in does not add more free uses. Contact support for premium."
            )

    def record_kundali_for_ip(
        self,
        client_ip: str,
        *,
        user: dict[str, Any] | None = None,
        guest_id: str = "",
    ) -> dict[str, Any]:
        data = self.load()
        ip_record = self.get_or_create_ip_record(data, client_ip)
        self._bootstrap_ip_from_legacy(data, ip_record, user=user, guest_id=guest_id)
        self.check_ip_kundali_allowed(ip_record)
        ip_record["kundali_used"] = int(ip_record.get("kundali_used") or 0) + 1
        if user:
            self._sync_ip_usage_to_user(data, ip_record, user)
        if guest_id:
            self._sync_ip_usage_to_guest(data, ip_record, guest_id)
        self.save(data)
        return self.public_usage_from_ip(ip_record, is_guest=user is None, user=user)

    def record_auspicious_for_ip(
        self,
        client_ip: str,
        *,
        user: dict[str, Any] | None = None,
        guest_id: str = "",
    ) -> dict[str, Any]:
        data = self.load()
        ip_record = self.get_or_create_ip_record(data, client_ip)
        self._bootstrap_ip_from_legacy(data, ip_record, user=user, guest_id=guest_id)
        self.check_ip_auspicious_allowed(ip_record)
        ip_record["auspicious_used"] = int(ip_record.get("auspicious_used") or 0) + 1
        if user:
            self._sync_ip_usage_to_user(data, ip_record, user)
        if guest_id:
            self._sync_ip_usage_to_guest(data, ip_record, guest_id)
        self.save(data)
        return self.public_usage_from_ip(ip_record, is_guest=user is None, user=user)

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
        def bump(data: dict[str, Any]) -> None:
            site = data.setdefault("site", {})
            site["view_count"] = int(site.get("view_count") or 0) + 1

        data = self._mutate(bump)
        return int(data.get("site", {}).get("view_count") or 0)

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

    def resolve_token(self, token: str) -> dict[str, Any] | None:
        if not token:
            return None
        data = self.load()
        session = (data.get("sessions") or {}).get(token)
        if not isinstance(session, dict):
            return None
        expires_raw = session.get("expires_at")
        try:
            expires = datetime.fromisoformat(str(expires_raw))
            if expires.tzinfo is None:
                expires = expires.replace(tzinfo=timezone.utc)
        except (TypeError, ValueError):
            return None
        if _utc_now() > expires:
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
        return {
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
