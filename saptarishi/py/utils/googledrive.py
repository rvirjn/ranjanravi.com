# Copyright © 2018-2026 ranjanravi.com. All rights reserved.
"""Read/update ``users.json`` on Google Drive (service account)."""

from __future__ import annotations

import json
import os
import re
import subprocess
import sys
import threading
from pathlib import Path
from typing import Any

_drive_service_lock = threading.Lock()
_drive_service_client: Any = None

from utils.constant import (
    USERS_GDRIVE_CREDENTIALS_REL_PATH,
    USERS_GDRIVE_FILE_ID,
    USERS_GDRIVE_MIME_TYPE,
)

# Full Drive scope so a file shared with the service account can be updated in place.
_DRIVE_SCOPES = ("https://www.googleapis.com/auth/drive",)

_DRIVE_FILE_ID_RE = re.compile(
    r"(?:drive\.google\.com/(?:file/d/|open\?id=)|docs\.google\.com/.*?/d/)([a-zA-Z0-9_-]+)"
)


def parse_drive_file_id(url_or_id: str) -> str:
    """Extract a Drive file id from a sharing URL or return the id unchanged."""
    raw = str(url_or_id or "").strip()
    if not raw:
        raise ValueError("Google Drive file id or URL is required")
    match = _DRIVE_FILE_ID_RE.search(raw)
    if match:
        return match.group(1)
    if re.fullmatch(r"[a-zA-Z0-9_-]{10,}", raw):
        return raw
    raise ValueError(f"Not a valid Google Drive file id or URL: {raw!r}")


def users_gdrive_file_id() -> str:
    env_id = os.environ.get("SAPTARISHI_GDRIVE_FILE_ID", "").strip()
    return parse_drive_file_id(env_id or USERS_GDRIVE_FILE_ID)


def gdrive_credentials_configured() -> bool:
    if os.environ.get("SAPTARISHI_GDRIVE_CREDENTIALS_JSON", "").strip():
        return True
    path = _credentials_path()
    return bool(path and path.is_file())


def users_storage_backend() -> str:
    """``gdrive`` when credentials exist (unless forced local), else ``local``."""
    forced = os.environ.get("SAPTARISHI_USERS_STORAGE", "").strip().lower()
    if forced in ("local", "file"):
        return "local"
    if forced in ("gdrive", "drive", "google"):
        return "gdrive"
    return "gdrive" if gdrive_credentials_configured() else "local"


def _project_root() -> Path:
    return Path(__file__).resolve().parents[2]


def _default_credentials_path() -> Path:
    return _project_root() / USERS_GDRIVE_CREDENTIALS_REL_PATH


def _credentials_path() -> Path | None:
    for key in ("SAPTARISHI_GDRIVE_CREDENTIALS_PATH", "GOOGLE_APPLICATION_CREDENTIALS"):
        value = os.environ.get(key, "").strip()
        if value:
            path = Path(value)
            if not path.is_absolute():
                path = _project_root() / path
            return path
    default = _default_credentials_path()
    if default.is_file():
        return default
    return None


def _load_service_account_info() -> dict[str, Any]:
    inline = os.environ.get("SAPTARISHI_GDRIVE_CREDENTIALS_JSON", "").strip()
    if inline:
        return json.loads(inline)
    path = _credentials_path()
    if path and path.is_file():
        return json.loads(path.read_text(encoding="utf-8"))
    raise RuntimeError(
        "Google Drive credentials missing. Set SAPTARISHI_GDRIVE_CREDENTIALS_JSON "
        "(Render) or SAPTARISHI_GDRIVE_CREDENTIALS_PATH / GOOGLE_APPLICATION_CREDENTIALS (local)."
    )


def load_service_account_info() -> dict[str, Any]:
    """Service account JSON used for Drive and Gmail send."""
    return _load_service_account_info()


def service_account_client_email() -> str:
    return str(load_service_account_info().get("client_email") or "").strip()


_GOOGLE_DRIVE_PIP_PACKAGES = (
    "google-api-python-client>=2.100.0",
    "google-auth>=2.23.0",
    "google-auth-httplib2>=0.2.0",
)


def _google_imports_ok() -> bool:
    try:
        import google.oauth2  # noqa: F401
        import googleapiclient  # noqa: F401
        return True
    except ImportError:
        return False


def _pip_install_google_deps() -> None:
    req = _project_root() / "requirements-flask.txt"
    cmd = [sys.executable, "-m", "pip", "install", "--no-cache-dir"]
    if req.is_file():
        subprocess.check_call(cmd + ["-r", str(req)])
    else:
        subprocess.check_call(cmd + list(_GOOGLE_DRIVE_PIP_PACKAGES))


def ensure_google_drive_deps(*, install_if_missing: bool = True) -> None:
    """Ensure google-api-python-client is importable (install on Render if build skipped deps)."""
    if _google_imports_ok():
        return
    if install_if_missing:
        try:
            _pip_install_google_deps()
        except subprocess.CalledProcessError as exc:
            raise RuntimeError(
                "Failed to pip install Google Drive dependencies. "
                "Commit requirements-flask.txt (google-* packages) and redeploy."
            ) from exc
        if _google_imports_ok():
            return
    raise RuntimeError(
        "Google Drive user DB is enabled but google-api-python-client is not installed. "
        "Redeploy after pushing requirements-flask.txt with google-api-python-client."
    )


def _drive_service():
    global _drive_service_client
    if _drive_service_client is not None:
        return _drive_service_client
    with _drive_service_lock:
        if _drive_service_client is not None:
            return _drive_service_client
        ensure_google_drive_deps()
        from google.oauth2 import service_account
        from googleapiclient.discovery import build

        creds = service_account.Credentials.from_service_account_info(
            _load_service_account_info(),
            scopes=_DRIVE_SCOPES,
        )
        _drive_service_client = build("drive", "v3", credentials=creds, cache_discovery=False)
        return _drive_service_client


def download_file_bytes(file_id: str | None = None) -> bytes:
    """Download a Drive file by id (default: ``users.json``)."""
    fid = parse_drive_file_id(file_id or users_gdrive_file_id())
    service = _drive_service()
    return service.files().get_media(fileId=fid).execute()


def update_file_bytes(
    content: bytes,
    *,
    file_id: str | None = None,
    mime_type: str = USERS_GDRIVE_MIME_TYPE,
) -> dict[str, Any]:
    """Replace a Drive file's contents (same file id, in-place update)."""
    from googleapiclient.http import MediaInMemoryUpload

    fid = parse_drive_file_id(file_id or users_gdrive_file_id())
    media = MediaInMemoryUpload(content, mimetype=mime_type, resumable=False)
    service = _drive_service()
    return (
        service.files()
        .update(fileId=fid, media_body=media, fields="id,name,modifiedTime,size")
        .execute()
    )


def download_users_json_text() -> str:
    return download_file_bytes().decode("utf-8")


def update_users_json(data: dict[str, Any] | str) -> dict[str, Any]:
    """Serialize and upload ``users.json`` to the configured Drive file."""
    if isinstance(data, str):
        text = data if data.endswith("\n") else data + "\n"
    else:
        text = json.dumps(data, indent=2, ensure_ascii=False) + "\n"
    return update_file_bytes(text.encode("utf-8"))
