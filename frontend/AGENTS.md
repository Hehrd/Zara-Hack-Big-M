# AGENTS.md

## Project overview

This is a JavaScript-only React/Vite frontend optimized for hackathon iteration and AI-agent collaboration. It uses Tailwind CSS and shadcn/ui for presentation, TanStack Router file routes for pages, TanStack Query for server state, Axios for HTTP, Zustand for small client-only state, and MSW as the development backend.

## Architecture and request flow

`page -> hook -> api function -> Axios client -> MSW or Spring Boot -> React Query cache -> page`

Pages never call Axios directly. API functions know endpoint paths but no UI details. Hooks own query keys and query behavior. MSW intercepts the same URLs the real backend will expose, so replacing mocks does not require UI changes.

## Folder responsibilities

- `src/api/`: shared Axios client, Query client, and one endpoint module per resource.
- `src/mocks/`: shared handlers plus browser and Node adapters. Keep mock response shapes aligned with backend DTOs.
- `src/routes/`: generated TanStack file-route definitions and root layout. Never edit `routeTree.gen.js` by hand.
- `src/components/`: reusable product components; generated shadcn primitives live in `components/ui/`.
- `src/pages/`: route-level composition. Keep business requests in hooks/API modules.
- `src/hooks/`: reusable React Query and UI hooks.
- `src/store/`: Zustand client state only. Do not duplicate remote data here.
- `src/lib/`: framework-agnostic utilities.
- `src/agents/`: concise AI context and implementation checklists.

## MSW and Spring Boot mapping

Handlers use wildcard origins (`*/health`) so they match both same-origin development calls and a configured Spring Boot origin. Endpoint paths and JSON shapes should mirror `@RestController` mappings and DTOs. To use a real backend, set `VITE_API_BASE_URL=http://localhost:8080` and `VITE_ENABLE_MOCKS=false` in `.env.local`; no component changes are needed. Configure Spring Boot CORS for the Vite origin when the servers use different origins.

## Adding an endpoint

1. Add a focused function in `src/api/<resource>.js` using `apiClient`.
2. Add its MSW handler in `src/mocks/handlers.js` with the intended backend DTO shape.
3. Add a React Query hook in `src/hooks/` with a stable array query key.
4. Consume the hook from a page/component and cover loading, error, and empty/success states.
5. When Spring Boot exists, implement the same HTTP method, path, status code, and response body there.

## Adding a page

1. Create a named component in `src/pages/`.
2. Add a matching file in `src/routes/`; the Vite plugin updates `src/routeTree.gen.js` automatically.
3. Add navigation in `src/components/layout/AppShell.jsx` when it is user-facing.
4. Keep route files orchestration-focused; extract reusable UI and data logic.

## Conventions

- JavaScript/JSX only; do not add TypeScript files or configs.
- Use the `@/` alias for `src/` imports and relative imports inside a small module family.
- Use named exports except for the root `App` component.
- Prefer shadcn/ui whenever an applicable component or primitive exists. Before building reusable UI such as notifications, toasts, forms, menus, tables, or overlays, check the shadcn registry first.
- Add shadcn components through the official CLI, then adapt or compose the generated component in `src/components/ui/` instead of creating a competing custom primitive.
- Custom UI is appropriate when shadcn has no suitable foundation or when product requirements materially differ. Document that choice briefly when it is not obvious.
- Keep product-specific behavior and composition outside `src/components/ui/`; generated primitives should remain broadly reusable and easy to update.
- Server state belongs in React Query; transient app/user/selection state belongs in Zustand.
- Environment values must use `VITE_` names. Never commit secrets.
- Before handing off: run `npm run lint` and `npm run build`, then verify affected routes with MSW enabled.
