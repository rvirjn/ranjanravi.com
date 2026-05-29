# Copyright © 2018-2026 ranjanravi.com. All rights reserved.
"""User registration, login, sessions, and usage limits (``database/users.json``)."""

from __future__ import annotations

import hashlib
import json
import re
import secrets
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from utils.constant import (
    GUEST_ID_MAX_LENGTH,
    MAX_AUSPICIOUS_PER_GUEST,
    MAX_AUSPICIOUS_PER_USER,
    MAX_KUNDALI_PER_GUEST,
    MAX_KUNDALI_PER_USER,
    MIN_PASSWORD_LENGTH,
    MOBILE_DIGITS_MAX,
    MOBILE_DIGITS_MIN,
    SESSION_TTL_DAYS,
    USERS_JSON_REL_PATH,
)


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
    """Read/write ``database/users.json`` with in-process session lookup."""

    def __init__(self, project_root: Path) -> None:
        self.path = project_root / USERS_JSON_REL_PATH

    def _default_db(self) -> dict[str, Any]:
        return {"site": {"view_count": 0}, "sessions": {}, "users": [], "guests": {}}

    def load(self) -> dict[str, Any]:
        if not self.path.is_file():
            data = self._default_db()
            self.save(data)
            return data
        text = self.path.read_text(encoding="utf-8")
        data = json.loads(text) if text.strip() else self._default_db()
        data.setdefault("site", {"view_count": 0})
        data.setdefault("sessions", {})
        data.setdefault("users", [])
        data.setdefault("guests", {})
        return data

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
        return {
            "is_guest": True,
            "id": guest.get("id"),
            "kundali_used": int(guest.get("kundali_used") or 0),
            "auspicious_used": int(guest.get("auspicious_used") or 0),
            "kundali_remaining": max(
                0, MAX_KUNDALI_PER_GUEST - int(guest.get("kundali_used") or 0)
            ),
            "auspicious_remaining": max(
                0, MAX_AUSPICIOUS_PER_GUEST - int(guest.get("auspicious_used") or 0)
            ),
            "kundali_limit": MAX_KUNDALI_PER_GUEST,
            "auspicious_limit": MAX_AUSPICIOUS_PER_GUEST,
        }

    def save(self, data: dict[str, Any]) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.path.write_text(
            json.dumps(data, indent=2, ensure_ascii=False) + "\n",
            encoding="utf-8",
        )

    def increment_view_count(self) -> int:
        data = self.load()
        site = data.setdefault("site", {})
        site["view_count"] = int(site.get("view_count") or 0) + 1
        self.save(data)
        return int(site["view_count"])

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
        data = self.load()
        mobile_n = normalize_mobile(mobile)
        email_n = normalize_email(email)
        name_n = normalize_name(name)
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
        self.save(data)
        return self.public_user(user)

    def login(self, mobile: str, password: str) -> tuple[dict[str, Any], str]:
        data = self.load()
        mobile_n = normalize_mobile(mobile)
        user = self.find_user_by_mobile(data, mobile_n)
        if not user or not verify_password(password, user.get("password_hash", "")):
            raise ValueError("invalid mobile or password")
        token = secrets.token_urlsafe(32)
        expires = (_utc_now() + timedelta(days=SESSION_TTL_DAYS)).isoformat()
        data.setdefault("sessions", {})[token] = {
            "user_id": user["id"],
            "expires_at": expires,
            "created_at": _iso_now(),
        }
        self.save(data)
        return self.public_user(user), token

    def logout(self, token: str) -> None:
        if not token:
            return
        data = self.load()
        sessions = data.get("sessions") or {}
        if token in sessions:
            del sessions[token]
            self.save(data)

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
        return {
            "is_guest": False,
            "id": user.get("id"),
            "name": user.get("name"),
            "mobile": user.get("mobile"),
            "email": user.get("email"),
            "kundali_used": int(user.get("kundali_used") or 0),
            "auspicious_used": int(user.get("auspicious_used") or 0),
            "kundali_remaining": max(
                0, MAX_KUNDALI_PER_USER - int(user.get("kundali_used") or 0)
            ),
            "auspicious_remaining": max(
                0, MAX_AUSPICIOUS_PER_USER - int(user.get("auspicious_used") or 0)
            ),
            "kundali_limit": MAX_KUNDALI_PER_USER,
            "auspicious_limit": MAX_AUSPICIOUS_PER_USER,
        }

    def check_kundali_allowed(self, user: dict[str, Any]) -> None:
        used = int(user.get("kundali_used") or 0)
        if used >= MAX_KUNDALI_PER_USER:
            raise ValueError(
                f"kundali limit reached ({MAX_KUNDALI_PER_USER} per account). "
                "Contact support to upgrade."
            )

    def check_auspicious_allowed(self, user: dict[str, Any]) -> None:
        used = int(user.get("auspicious_used") or 0)
        if used >= MAX_AUSPICIOUS_PER_USER:
            raise ValueError(
                f"auspicious scan limit reached ({MAX_AUSPICIOUS_PER_USER} per account). "
                "Contact support to upgrade."
            )

    def record_kundali_use(self, user_id: str) -> dict[str, Any]:
        data = self.load()
        user = self.find_user_by_id(data, user_id)
        if not user:
            raise ValueError("user not found")
        self.check_kundali_allowed(user)
        user["kundali_used"] = int(user.get("kundali_used") or 0) + 1
        self.save(data)
        return self.public_user(user)

    def record_auspicious_use(self, user_id: str) -> dict[str, Any]:
        data = self.load()
        user = self.find_user_by_id(data, user_id)
        if not user:
            raise ValueError("user not found")
        self.check_auspicious_allowed(user)
        user["auspicious_used"] = int(user.get("auspicious_used") or 0) + 1
        self.save(data)
        return self.public_user(user)

    def check_guest_kundali_allowed(self, guest: dict[str, Any]) -> None:
        used = int(guest.get("kundali_used") or 0)
        if used >= MAX_KUNDALI_PER_GUEST:
            raise ValueError(
                f"free kundali limit reached ({MAX_KUNDALI_PER_GUEST}). "
                "Login or register for premium access."
            )

    def check_guest_auspicious_allowed(self, guest: dict[str, Any]) -> None:
        used = int(guest.get("auspicious_used") or 0)
        if used >= MAX_AUSPICIOUS_PER_GUEST:
            raise ValueError(
                f"free auspicious limit reached ({MAX_AUSPICIOUS_PER_GUEST}). "
                "Login or register for premium access."
            )

    def record_guest_kundali_use(self, guest_id: str) -> dict[str, Any]:
        data = self.load()
        guest = self.get_or_create_guest(data, guest_id)
        self.check_guest_kundali_allowed(guest)
        guest["kundali_used"] = int(guest.get("kundali_used") or 0) + 1
        self.save(data)
        return self.public_guest(guest)

    def record_guest_auspicious_use(self, guest_id: str) -> dict[str, Any]:
        data = self.load()
        guest = self.get_or_create_guest(data, guest_id)
        self.check_guest_auspicious_allowed(guest)
        guest["auspicious_used"] = int(guest.get("auspicious_used") or 0) + 1
        self.save(data)
        return self.public_guest(guest)
