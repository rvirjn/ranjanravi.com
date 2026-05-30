<!-- Copyright © 2018-2026 ranjanravi.com. All rights reserved. -->

# Saptarishi

Vedic birth chart (kundali): sidereal chart, planet strength table, and Moon janma nakshatra wheel.  
Copyright © 2018-2026 [ranjanravi.com](https://ranjanravi.com). All rights reserved.

## URL

| What | URL |
|------|-----|
| **App (subdomain)** | [https://saptarishi.ranjanravi.com/](https://saptarishi.ranjanravi.com/) → Kundali |
| **Auspicious** | [https://saptarishi.ranjanravi.com/ui/html/auspicious.html](https://saptarishi.ranjanravi.com/ui/html/auspicious.html) |
| **API (Render)** | [https://api.ranjanravi.com](https://api.ranjanravi.com) |

Legacy path on main domain: `https://ranjanravi.com/saptarishi/` (same files under `public_html/saptarishi/`).

DNS / subdomain forwarding (GoDaddy + GitHub Pages): [`deploy/godaddy/README.md`](deploy/godaddy/README.md).

## Deployments

| Environment | Flask API | UI |
|-------------|-----------|-----|
| **Production** | [https://api.ranjanravi.com](https://api.ranjanravi.com) (Render) | GitHub Pages at `ranjanravi.com/saptarishi/`; subdomain via GoDaddy **forwarding** (see `deploy/godaddy/README.md`) |
| **Local dev** | `http://localhost:8081` (Docker `saptarishi_flask`) | `http://localhost:9999/ui/html/kundali.html` (Docker `saptarishi_ui`) |

The UI calls the production API when opened from a non-localhost host (`ui/utils/constants.js` → `PRODUCTION_API_ORIGIN`).  
On **localhost**, it calls port **8081** automatically.

Open **`ui/html/kundali.html`** (or `index.html`). No login is required at first.

### Accounts and limits

- **Without login:** **5 kundali** and **2 auspicious** scans per **public IP** (from `X-Forwarded-For` / `X-Real-IP` on Render; not Docker private `172.x`).
- **After login:** same IP keeps the same counts — logging in does **not** add another 5 + 2.
- **After the limit:** login/register popup for **premium** (stored in `users.json` → `usage_by_ip`).
- Register with **name**, **mobile**, **email**, and **password** (stored in `database/users.json`; created automatically on first use).
- **Website view count** is tracked in `users.json` under `site.view_count` and shown in the header.

## Project layout

| Path | Role |
|------|------|
| `py/kundali.py` | Chart calculation and API payload |
| `py/auspicious.py` | Top house-strength slots in a date range |
| `py/navatara.py` | Navatara CLI shim |
| `py/utils/constant.py` | Shared constants (`FLASK_PUBLIC_API_ORIGIN`, etc.) |
| `api/flask/app.py` | Flask app (Render + local container) |
| `database/data.json` | Planets, nakshatras, `planet_rules`, `house_rules` |
| `database/users.json` | Local dev only (gitignored). **Production:** Google Drive via `py/utils/googledrive.py` (file id in `py/utils/constant.py`) |
| `py/auth.py` | Registration, login, session tokens, usage limits |
| `ui/html/`, `ui/js/`, `ui/style/`, `ui/utils/` | Static UI (`common.js` = header/footer/nav; `auth-modal.js` = login popup) |
| `Dockerfile.flask` | Local API image only |
| `output/kundali/` | CLI-written kundali JSON (`{date}_{time}_{place}.json`) |
| `output/auspicious/` | CLI-written auspicious JSON (`{from}_{to}_{place}.json`) |

## Production (Render)

**URL:** `https://api.ranjanravi.com`

Flask runs on Render and listens on Render’s `PORT` (see `api/flask/app.py`).  
CORS is enabled so the static UI on another host can call the API.

### Render settings (typical)

- **Runtime:** Python (not Node — there is no `package.json` in this folder)
- **Root directory:** `saptarishi` (repo subfolder if the repo root is the site monorepo)
- **Build command:** `pip install -r requirements-flask.txt` (must include `google-api-python-client` — commit `requirements-flask.txt` before deploy)
- **Start command:** `python api/flask/app.py`
- **Environment (optional):** `SAPTARISHI_PUBLIC_ORIGIN=https://api.ranjanravi.com` (default in code)
- **User DB on Google Drive (production):** see [Google Drive user database](#google-drive-user-database) below

Repo root [`render.yaml`](../render.yaml) documents the same settings for a Blueprint deploy.

### Google Drive user database

Production stores `users.json` on Google Drive (not in the repo). `UserStore` calls `update_users_json()` / `download_users_json_text()` in `py/utils/googledrive.py` when service-account credentials are set.

1. In [Google Cloud Console](https://console.cloud.google.com/), enable **Google Drive API** for your project.
2. Create a **service account**, download its JSON key (do not commit it).
3. Share your Drive `users.json` with the service account **`client_email`** from that JSON, as **Editor**.
4. **Local:** place the key at the path in `USERS_GDRIVE_CREDENTIALS_REL_PATH` (`py/utils/constant.py`, gitignored). The API uses Drive when that file exists.
5. **Render:** set `SAPTARISHI_GDRIVE_CREDENTIALS_JSON` to the full JSON (secret). Set `SAPTARISHI_GDRIVE_FILE_ID` to your Drive file id (or keep the default in `constant.py`).
6. **Local without Drive:** remove/rename the key file, or set `SAPTARISHI_USERS_STORAGE=local`.

Force local file even with credentials set: `SAPTARISHI_USERS_STORAGE=local`. Force Drive: `SAPTARISHI_USERS_STORAGE=gdrive`.

**Deploy error `Couldn't find a package.json`:** the service is configured as Node with `yarn` / `yarn start`. In Render → your service → **Settings**, set **Runtime** to **Python 3**, then use the build/start commands above (or sync from `render.yaml`).

Ensure `database/data.json`, `py/`, and `ephe/` (if used) are deployed with the service.

### API (production)

All chart endpoints require `Authorization: Bearer <token>` from login/register.

```text
GET  https://api.ranjanravi.com/
POST https://api.ranjanravi.com/api/site/view
POST https://api.ranjanravi.com/api/auth/register   JSON: name, mobile, email, password
POST https://api.ranjanravi.com/api/auth/login      JSON: mobile, password
GET  https://api.ranjanravi.com/api/planet-database
GET  https://api.ranjanravi.com/api/kundali?date=YYYY-MM-DD&time=HH:MM&place=City&house_system=W
GET  https://api.ranjanravi.com/api/auspicious?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD&place=City&house_system=W
```

After deploy, verify:

```powershell
curl.exe -s "https://api.ranjanravi.com/"

curl.exe -s "https://api.ranjanravi.com/api/kundali?date=2026-06-18&time=13:00&place=Bengaluru,+India&house_system=W"

curl.exe -s "https://api.ranjanravi.com/api/auspicious?date_from=2026-05-20&date_to=2026-06-20&place=Bengaluru,+India&house_system=W"
```

Redeploy on Render after changing Python or `data.json`. After adding Google Drive deps, trigger a **clear-cache rebuild** (Docker image or `pip install -r requirements-flask.txt` on Render).

---

## Local development (Docker)

Use two containers on **localhost** — same code as production, different hosts/ports.

Prerequisites: Docker; shell in the **saptarishi** directory.

### 1) Network (once)

```powershell
docker network create my-net
```

### 2) UI container (`saptarishi_ui`, port 9999)

```powershell
docker rm -f saptarishi_ui
docker run -d `
  --name saptarishi_ui `
  --network my-net `
  --publish 9999:80 `
  -v "${PWD}:/usr/share/nginx/html:ro" `
  raviranjanamu/nginx
```

Open: **http://localhost:9999/ui/html/kundali.html**  
The page calls **http://localhost:8081** for API requests.

### 3) Flask API container (`saptarishi_flask`, port 8081)

```powershell
docker build -f Dockerfile.flask -t saptarishi-flask:latest .

docker rm -f saptarishi_flask
docker run -d `
  --name saptarishi_flask `
  --network my-net `
  --publish 8081:8081 `
  -v "${PWD}:/app" `
  --workdir /app `
  saptarishi-flask:latest
```

- Rebuild image after `requirements-flask.txt` or `Dockerfile.flask` changes, then **recreate** the container (``docker restart`` alone keeps the old start command).
- `docker restart saptarishi_flask` after `py/` or `data.json` changes (code is volume-mounted; no rebuild needed).

### Local verify

```powershell
docker ps --filter "name=saptarishi"

curl.exe -s "http://localhost:9999/ui/html/kundali.html" | Select-String -Pattern "Kundali"

curl.exe -s "http://localhost:9999/ui/html/auspicious.html" | Select-String -Pattern "Auspicious"

curl.exe -s "http://localhost:8081/"

curl.exe -s "http://localhost:8081/api/kundali?date=2026-06-18&time=13:00&place=Bengaluru,+India&house_system=W"

curl.exe -s "http://localhost:8081/api/auspicious?date_from=2026-05-20&date_to=2026-06-20&place=Bengaluru,+India&house_system=W"
```

### Local logs

```powershell
docker logs -f saptarishi_ui
docker logs -f saptarishi_flask

docker stop saptarishi_ui saptarishi_flask
docker start saptarishi_ui saptarishi_flask
docker rm -f saptarishi_ui saptarishi_flask
```

---

## CLI (optional)

```powershell
python py/kundali.py --date 1988-03-29 --time 16:33 --place "Motihari, India"

python py/auspicious.py --from 2026-05-20 --to 2026-06-20 --place "Bengaluru, India"
```

## Planet strength rules

Edit `database/data.json` → `planet_rules` and `house_rules`.  
Restart local Flask or redeploy Render, then hard-refresh the UI (Ctrl+Shift+R).

## Legal

See [COPYRIGHT](COPYRIGHT).
