<!-- Copyright © 2018-2026 ranjanravi.com. All rights reserved. -->

# Saptarishi

Vedic birth chart (kundali) calculator: sidereal chart, planet strength table, and Moon janma nakshatra wheel.  
Copyright © 2018-2026 [ranjanravi.com](https://ranjanravi.com). All rights reserved.

## Layout

| Path | Role |
|------|------|
| `main/get_kundali.py` | Chart calculation, enrichment, API payload (`planets_table`, `summary_table`, `nakshatras`) |
| `main/constant.py` | Shared constants |
| `database/data.json` | Planets, nakshatras, houses, `planet_strength_rules` |
| `ui/kundali.html` | **Only UI page** — birth form, summary, chart, planets & nakshatra tables |
| `ui/kundali.js`, `ui/styles.css`, `ui/constants.js` | UI logic and styles |
| `ui/app.py` | Flask API on port **8081** |
| `output/` | Saved kundali JSON (when written by CLI) |

There is **no** `index.html`, `hompage.html`, or separate nakshatra page — open **`kundali.html`** directly.

## Run with Docker (recommended)

Two containers:

- **`saptarishi_ui`** — static UI (nginx) on port **9999**
- **`saptarishi_flask`** — API on port **8081**

Prerequisites: Docker, shell in the **saptarishi** directory (contains `ui/`, `main/`, `database/`).

### 1) Network (once)

```powershell
docker network create my-net
```

### 2) UI container

```powershell
docker rm -f saptarishi_ui
docker run -d `
  --name saptarishi_ui `
  --network my-net `
  --publish 9999:80 `
  -v "${PWD}:/usr/share/nginx/html:ro" `
  raviranjanamu/nginx
```

Open:

- **http://localhost:9999/ui/kundali.html**

Do not rely on a site root `index.html`; the app entry point is `kundali.html` only.

### 3) Flask API container

Build once (needs a C compiler in the image for `pyswisseph`):

```powershell
docker build -f Dockerfile.flask -t saptarishi-flask:latest .
```

Run (live code mounted at `/app`):

```powershell
docker rm -f saptarishi_flask
docker run -d `
  --name saptarishi_flask `
  --network my-net `
  --publish 8081:8081 `
  -v "${PWD}:/app" `
  --workdir /app `
  saptarishi-flask:latest
```

After changing Python or `requirements-flask.txt`, rebuild the image and recreate the container.  
After changing only `get_kundali.py` or `data.json`, restart: `docker restart saptarishi_flask`.

### API endpoints

| URL | Purpose |
|-----|---------|
| `GET /` | Service info JSON |
| `GET /api/planet-database` | Full `database/data.json` |
| `GET /api/kundali?date=YYYY-MM-DD&time=HH:MM&place=City&house_system=W` | Full chart + UI tables |

Example:

```text
http://localhost:8081/api/kundali?date=2026-06-18&time=13:00&place=Bengaluru,+India&house_system=W
```

`house_system`: `W` (whole sign, default), `P`, or `A`.

### 4) Verify

```powershell
docker ps --filter "name=saptarishi"

curl.exe -s "http://localhost:9999/ui/kundali.html" | Select-String -Pattern "Kundali"

curl.exe -s "http://localhost:8081/"

curl.exe -s "http://localhost:8081/api/kundali?date=2026-06-18&time=13:00&place=Bengaluru,+India&house_system=W"
```

### 5) Logs and lifecycle

```powershell
docker logs -f saptarishi_ui
docker logs -f saptarishi_flask

docker stop saptarishi_ui saptarishi_flask
docker start saptarishi_ui saptarishi_flask
docker rm -f saptarishi_ui saptarishi_flask
```

## CLI (optional)

From `saptarishi/main`:

```powershell
python get_kundali.py --date 1988-03-29 --time 16:33 --place "Motihari, India"
```

Writes JSON under `output/` and prints debug tables.

## Planet strength rules

Configured in `database/data.json` → `planet_strength_rules.strength_factors` (degree bands, exalted, debilitated, own sign, retrograde, combustion, death degree, limits).  
Restart Flask after editing `data.json`, then recalculate in the UI (hard refresh: Ctrl+Shift+R).

## Legal

See [COPYRIGHT](COPYRIGHT).
