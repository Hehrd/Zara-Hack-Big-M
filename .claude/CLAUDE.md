# OpenKBS Project

## Auto-load skill (DO NOT SKIP)

You MUST load the openkbs skill at the start of every session: `/openkbs`

## Quick Reference

- `openkbs deploy` — Deploy elastic services (Postgres, Storage, MQTT)
- `openkbs site deploy` — Deploy static site
- `openkbs fn deploy <name>` — Deploy function
- AI Proxy: `https://proxy.openkbs.com` — Use `OPENKBS_API_KEY` for auth
- List models: `curl https://proxy.openkbs.com/v1/models`

## App URLs (local run)

- Backend (Spring Boot, port 6969):
  - Local: `http://localhost:6969`
  - Public: `https://6969-p-ba78a5a4d8b7.vs2.openkbs.com`
- Frontend (Vite/React, port 3000):
  - Local: `http://localhost:3000`
  - Public: `https://3000-p-ba78a5a4d8b7.vs2.openkbs.com`

The frontend's `VITE_API_BASE_URL` is set to the backend public URL in `frontend/.env`.
