# Saptarishi Docker Run Guide

This project uses two containers:

- `saptarishi_ui` -> serves only UI HTML/JS on port `9999`
- `saptarishi_flask` -> serves only REST APIs on port `8081`

## Prerequisites

- Docker installed and running
- Open terminal in project root:
  - `C:\Users\drkum\Documents\workspace\saptarishi`

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

Important:

- UI must be opened from port `9999` only.

## 3) Run Flask container (`saptarishi_flask`)

```powershell
docker rm -f saptarishi_flask
docker run -d `
  --name saptarishi_flask `
  --network my-net `
  --publish 8081:8081 `
  -v "${PWD}:/app" `
  --workdir /app `
  python:3.12-slim `
  sh -lc "pip install --no-cache-dir flask && python ui/app.py"
```

Flask API URL:

- `http://localhost:8081/api/nakshatras`
- `http://localhost:8081/api/chakras?nakshatra=rohini`

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
curl.exe -s "http://localhost:8081/api/chakras?nakshatra=rohini"
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
