<!-- Copyright © 2018-2026 ranjanravi.com. All rights reserved. -->

# Saptarishi

Vedic birth chart (kundali): sidereal chart, planet strength table, and Moon janma nakshatra wheel.  
Copyright © 2018-2026 [ranjanravi.com](https://ranjanravi.com). All rights reserved.

## URL

- **Entry:** [https://ranjanravi.com/saptarishi/ui/html/kundali.html](https://ranjanravi.com/saptarishi/ui/html/kundali.html) (login/register open in a popup)
- **Kundali:** [https://ranjanravi.com/saptarishi/ui/html/kundali.html](https://ranjanravi.com/saptarishi/ui/html/kundali.html)
- **Auspicious:** [https://ranjanravi.com/saptarishi/ui/html/auspicious.html](https://ranjanravi.com/saptarishi/ui/html/auspicious.html)

## Deployments

| Environment | Flask API | UI |
|-------------|-----------|-----|
| **Production** | [https://saptarishi.ranjanravi.com](https://saptarishi.ranjanravi.com) (Render) | Static `ui/html/` on your web host (e.g. nginx under `ranjanravi.com`) |
| **Local dev** | `http://localhost:8081` (Docker `saptarishi_flask`) | `http://localhost:9999/ui/html/kundali.html` (Docker `saptarishi_ui`) |

The UI calls the production API when opened from a non-localhost host (`ui/utils/constants.js` → `PRODUCTION_API_ORIGIN`).  
On **localhost**, it calls port **8081** automatically.

Open **`ui/html/kundali.html`** (or `index.html`). No login is required at first.

### Accounts and limits

- **Without login:** **5 free kundali** and **2 free auspicious** scans per browser (tracked by guest id in `users.json` → `guests`).
- **After the free limit:** login/register popup for **premium** (registered accounts: 5 kundali + 2 auspicious until upgrade).
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
| `database/data.json` | Planets, nakshatras, `planet_strength_rules` |
| `database/users.json` | Registered users, sessions, site view count (gitignored; auto-created by API) |
| `py/auth.py` | Registration, login, session tokens, usage limits |
| `ui/html/`, `ui/js/`, `ui/style/`, `ui/utils/` | Static UI (`common.js` = header/footer/nav; `auth-modal.js` = login popup) |
| `Dockerfile.flask` | Local API image only |
| `output/kundali/` | CLI-written kundali JSON (`{date}_{time}_{place}.json`) |
| `output/auspicious/` | CLI-written auspicious JSON (`{from}_{to}_{place}.json`) |

## Production (Render)

**URL:** `https://saptarishi.ranjanravi.com`

Flask runs on Render and listens on Render’s `PORT` (see `api/flask/app.py`).  
CORS is enabled so the static UI on another host can call the API.

### Render settings (typical)

- **Runtime:** Python (not Node — there is no `package.json` in this folder)
- **Root directory:** `saptarishi` (repo subfolder if the repo root is the site monorepo)
- **Build command:** `pip install -r requirements-flask.txt`
- **Start command:** `python api/flask/app.py`
- **Environment (optional):** `SAPTARISHI_PUBLIC_ORIGIN=https://saptarishi.ranjanravi.com` (default in code)

Repo root [`render.yaml`](../render.yaml) documents the same settings for a Blueprint deploy.

**Deploy error `Couldn't find a package.json`:** the service is configured as Node with `yarn` / `yarn start`. In Render → your service → **Settings**, set **Runtime** to **Python 3**, then use the build/start commands above (or sync from `render.yaml`).

Ensure `database/data.json`, `py/`, and `ephe/` (if used) are deployed with the service.

### API (production)

All chart endpoints require `Authorization: Bearer <token>` from login/register.

```text
GET  https://saptarishi.ranjanravi.com/
POST https://saptarishi.ranjanravi.com/api/site/view
POST https://saptarishi.ranjanravi.com/api/auth/register   JSON: name, mobile, email, password
POST https://saptarishi.ranjanravi.com/api/auth/login      JSON: mobile, password
GET  https://saptarishi.ranjanravi.com/api/planet-database
GET  https://saptarishi.ranjanravi.com/api/kundali?date=YYYY-MM-DD&time=HH:MM&place=City&house_system=W
GET  https://saptarishi.ranjanravi.com/api/auspicious?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD&place=City&house_system=W
```

After deploy, verify:

```powershell
curl.exe -s "https://saptarishi.ranjanravi.com/"

curl.exe -s "https://saptarishi.ranjanravi.com/api/kundali?date=2026-06-18&time=13:00&place=Bengaluru,+India&house_system=W"

curl.exe -s "https://saptarishi.ranjanravi.com/api/auspicious?date_from=2026-05-20&date_to=2026-06-20&place=Bengaluru,+India&house_system=W"
```

Redeploy on Render after changing Python or `data.json`.

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

Edit `database/data.json` → `planet_strength_rules`.  
Restart local Flask or redeploy Render, then hard-refresh the UI (Ctrl+Shift+R).

## Legal

See [COPYRIGHT](COPYRIGHT).
