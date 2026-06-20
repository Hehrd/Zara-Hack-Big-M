# ZaraHack Frontend

JavaScript-only React/Vite starter with Tailwind CSS, shadcn/ui, React Router, TanStack Query, Axios, Zustand, and MSW.

## Start

```bash
npm install
npm run dev
```

Open `http://localhost:5173/health`. MSW starts automatically in development and returns `{ "status": "ok" }`.

## Commands

```bash
npm run dev
npm run lint
npm run build
npm run preview
```

## Connect Spring Boot

Create `.env.local`:

```dotenv
VITE_API_BASE_URL=http://localhost:8080
VITE_ENABLE_MOCKS=false
```

The frontend continues to call `/health`, `/devices`, and `/alerts` through the shared Axios client.
