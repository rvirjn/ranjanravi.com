# Saptarishi Docker Run Guide

This project uses two containers:

- `saptarishi_ui` -> serves only UI HTML/JS on port `9999`
- `saptarishi_flask` -> serves only REST APIs on port `8081`

## Prerequisites

- Docker installed and running
- Open terminal in this repo’s **saptarishi** root (the folder that contains `ui/`, `main/`, and `database/`). For example:
  - `C:\Users\drkum\Documents\workspace\ranjanravi.com\saptarishi`
- Run `cd` there before the `docker run` commands so `${PWD}` mounts the correct tree for **both** UI and Flask.

## 1) Create network (once)

```powershell
docker network create my-net
```

If it already exists, Docker will show an error; that is fine.

## 2) Run UI container (`saptarishi_ui`)

```powershell
docker rm -f saptarishi_ui
docker run -d `
  --name saptarishi_ui `
  --network my-net `
  --publish 9999:80 `
  -v "${PWD}:/usr/share/nginx/html:ro" `
  raviranjanamu/nginx
```

UI URL:

- `http://localhost:9999/ui/hompage.html`
- `http://localhost:9999/ui/nakshatra.html`
- `http://localhost:9999/ui/kundali-summary.html` (after “Calculate kundali” on the Nakshatra page)

Important:

- UI must be opened from port `9999` only.

## 3) Flask image and container (`saptarishi_flask`)

The API needs **Flask**, **pyswisseph** (Swiss Ephemeris; compiles briefly, needs a C compiler during the image build only), and **tzdata**. Build once from the `saptarishi` directory:

```powershell
docker build -f Dockerfile.flask -t saptarishi-flask:latest .
```

Run the container (mounts your live code under `/app`):

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

After you change `requirements-flask.txt`, rebuild the image and recreate the container.

**Reload Python after editing `ui/app.py`:** Flask only loads routes at process start. If you see **404** on `/api/kundali` while the file on disk has that route, run `docker restart saptarishi_flask`. If you still use the old one-liner image that only runs `pip install flask`, switch to the `Dockerfile.flask` flow here so **pyswisseph** is available (otherwise kundali returns a `ModuleNotFoundError` after the route exists).

Flask API URL:

- `http://localhost:8081/api/nakshatras`
- `http://localhost:8081/api/navatara?nakshatra=rohini`

Important:

- API should be called on port `8081` only.
- `http://localhost:8081/` returns API info JSON, not UI pages.

## 4) Verify both containers

```powershell
docker ps --filter "name=saptarishi_ui" --filter "name=saptarishi_flask"
```

Quick checks:

```powershell
# UI page (must return HTML)
curl.exe -s "http://localhost:9999/ui/hompage.html"

# API root info (must return JSON)
curl.exe -s "http://localhost:8081/"

# API endpoint
curl.exe -s "http://localhost:8081/api/navatara?nakshatra=rohini"

# Kundali (expects 200 JSON after Dockerfile.flask build; 404 means Flask needs restart)
curl.exe -s "http://localhost:8081/api/kundali?date=1988-03-29&time=16:29&place=Bengaluru%2C%20India&house_system=W"
```

## 5) Useful commands

```powershell
# logs
docker logs -f saptarishi_ui
docker logs -f saptarishi_flask

# stop
docker stop saptarishi_ui saptarishi_flask

# start again
docker start saptarishi_ui saptarishi_flask

# remove
docker rm -f saptarishi_ui saptarishi_flask
```
