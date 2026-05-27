<!-- Copyright © 2018-2026 ranjanravi.com. All rights reserved. -->

# Saptarishi

Vedic birth chart (kundali): sidereal chart, planet strength table, and Moon janma nakshatra wheel.  
Copyright © 2018-2026 [ranjanravi.com](https://ranjanravi.com). All rights reserved.

## Deployments

| Environment | Flask API | UI |
|-------------|-----------|-----|
| **Production** | [https://saptarishi.ranjanravi.com](https://saptarishi.ranjanravi.com) (Render) | Static `ui/kundali.html` on your web host (e.g. nginx under `ranjanravi.com`) |
| **Local dev** | `http://localhost:8081` (Docker `saptarishi_flask`) | `http://localhost:9999/ui/kundali.html` (Docker `saptarishi_ui`) |

The UI calls the production API when opened from a non-localhost host (`ui/constants.js` → `PRODUCTION_API_ORIGIN`).  
On **localhost**, it calls port **8081** automatically.

There is **no** `index.html` — open **`kundali.html`** only.

## Project layout

| Path | Role |
|------|------|
| `main/get_kundali.py` | Chart calculation and API payload |
| `main/constant.py` | Shared constants (`FLASK_PUBLIC_API_ORIGIN`, etc.) |
| `database/data.json` | Planets, nakshatras, `planet_strength_rules` |
| `ui/kundali.html` | Single UI page |
| `ui/kundali.js`, `ui/styles.css`, `ui/constants.js` | UI logic |
| `ui/app.py` | Flask app (Render + local container) |
| `Dockerfile.flask` | Local API image only |
| `output/` | CLI-written kundali JSON |

## Production (Render)

**URL:** `https://saptarishi.ranjanravi.com`

Flask runs on Render and listens on Render’s `PORT` (see `ui/app.py`).  
CORS is enabled so the static UI on another host can call the API.

### Render settings (typical)

- **Root directory:** `saptarishi` (repo subfolder if the repo root is the site monorepo)
- **Build command:** `pip install -r requirements-flask.txt`
- **Start command:** `python ui/app.py`
- **Environment (optional):** `SAPTARISHI_PUBLIC_ORIGIN=https://saptarishi.ranjanravi.com` (default in code)

Ensure `database/data.json`, `main/`, and `ephe/` (if used) are deployed with the service.

### API (production)

```text
GET https://saptarishi.ranjanravi.com/
GET https://saptarishi.ranjanravi.com/api/planet-database
GET https://saptarishi.ranjanravi.com/api/kundali?date=YYYY-MM-DD&time=HH:MM&place=City&house_system=W
```

After deploy, verify:

```powershell
curl.exe -s "https://saptarishi.ranjanravi.com/"

curl.exe -s "https://saptarishi.ranjanravi.com/api/kundali?date=2026-06-18&time=13:00&place=Bengaluru,+India&house_system=W"
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

Open: **http://localhost:9999/ui/kundali.html**  
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

- Rebuild image after `requirements-flask.txt` changes.
- `docker restart saptarishi_flask` after `get_kundali.py` or `data.json` changes.

### Local verify

```powershell
docker ps --filter "name=saptarishi"

curl.exe -s "http://localhost:9999/ui/kundali.html" | Select-String -Pattern "Kundali"

curl.exe -s "http://localhost:8081/"

curl.exe -s "http://localhost:8081/api/kundali?date=2026-06-18&time=13:00&place=Bengaluru,+India&house_system=W"
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
cd main
python get_kundali.py --date 1988-03-29 --time 16:33 --place "Motihari, India"
```

## Planet strength rules

Edit `database/data.json` → `planet_strength_rules`.  
Restart local Flask or redeploy Render, then hard-refresh the UI (Ctrl+Shift+R).

## Legal

See [COPYRIGHT](COPYRIGHT).
