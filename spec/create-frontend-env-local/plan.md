# Create frontend/.env.local

## Context
The user wants a local environment override for the Vite frontend that points the API at the **local** backend (`http://localhost:6969` instead of the public openkbs URL in `frontend/.env`) and supplies real Google Maps credentials. Vite loads `.env.local` with higher precedence than `.env`, so this cleanly overrides the committed defaults without touching `frontend/.env`.

## Findings
- `frontend/.env.local` does not exist yet — this is a new file.
- It is gitignored via `*.local` in `frontend/.gitignore` (line 14), so the Google Maps key stays out of version control.
- `frontend/.env` currently sets `VITE_API_BASE_URL=https://6969-p-ba78a5a4d8b7.vs2.openkbs.com`; `.env.local` will override it to `http://localhost:6969`.
- The frontend (`:3000`) → backend (`:6969`) is still cross-origin, so CORS remains exercised; the backend already allows all origins.

## Plan
Create `frontend/.env.local` with exactly:

```
VITE_ENABLE_MOCKS=false
VITE_API_BASE_URL=http://localhost:6969
VITE_GOOGLE_MAPS_API_KEY=AIzaSyDCJxBsKaSDOqC-l3gUWYLb_g8T0uCoL-4
VITE_GOOGLE_MAPS_MAP_ID=DEMO_MAP_ID
```

## After applying
- The running Vite dev server (PID started earlier, log `/tmp/zara-frontend.log`) must be **restarted** to pick up the new env vars — Vite reads env only at startup. I can restart it if you want.

## Verification
- `cat frontend/.env.local` matches the content above.
- After restarting Vite, the Maps page (`/maps`) loads Google Maps with the provided key, and API calls (e.g. `/health`) target `http://localhost:6969`.
