# Copyright © 2018-2026 ranjanravi.com. All rights reserved.
# Saptarishi static UI (local Docker). Build from repo saptarishi/ (parent of frontend/):
#   docker build -f frontend/Dockerfile -t saptarishi-ui:latest .
FROM nginx:1.27-alpine

COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY index.html /usr/share/nginx/html/index.html
COPY frontend /usr/share/nginx/html/frontend

EXPOSE 80
