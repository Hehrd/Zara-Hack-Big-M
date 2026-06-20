# Agent context

Start with root `AGENTS.md`, then inspect the route, its hook, API function, and matching handler. The vertical slice is intentionally shallow. Preserve mock/backend response parity and avoid placing remote data in Zustand.

For reusable interface work, check shadcn/ui before designing a custom primitive. Prefer composing or extending the generated shadcn foundation while keeping product-specific behavior in feature components.

Current routes: `/`, `/health`, `/dashboard`, `/devices`, `/alerts`.

Smoke-test contract: `/health` must render `API status: ok` while development mocks are enabled.
