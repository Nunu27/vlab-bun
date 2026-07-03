# Frontend Architecture

The vLab Web UI (`apps/web`) is a React 19 SPA serving both the student and instructor experience.

## Tech Stack

- **Framework:** React 19, built with Vite 7
- **Styling:** Tailwind CSS v4 (CSS-first config, no `tailwind.config.*`) + shadcn/ui (`components.json`, style `radix-vega`, icons via `lucide`)
- **Routing:** [TanStack Router](https://tanstack.com/router/latest), file-based, code-split per route
- **Server state:** [TanStack Query](https://tanstack.com/query/latest) v5, accessed through a typed Eden-Treaty proxy (`@jawit/query`) rather than hand-written hooks
- **Client state:** Zustand v5 + `@jawit/zustand-helper`
- **Real-time:** `socket.io-client` (msgpack parser) carrying a Waycast RPC client
- **Other notables:** TanStack Form, TanStack Table, `driver.js` (onboarding tours), `guacamole-common-js`, `recharts`, `nuqs` (URL state)

The dev server proxies `/api` and `/ws` to the Manager (`:3000`) and `/display` to Guacamole (`:8080`); production builds output to `../../out/manager/public`, served directly by the Manager (single-origin deploy, no separate frontend host).

## Directory Structure

```
apps/web/src/
  routes/       TanStack Router file-based routes
  components/   buttons, data-table, forms, input, layouts, mdx-plugins, pages, sections, ui (shadcn primitives)
  hooks/        form/, pagination/, state/, ws.ts
  lib/          api.ts, router.ts, query.ts, middlewares.ts, ws.ts, utils.ts
  stores/       auth-store.ts (the only global store)
  shared/       guacamole/, topology/ — feature modules used across multiple routes
```

Every other Zustand store — roughly 18 of them — lives colocated under its route's `-module/stores/` folder (TanStack Router's convention: a leading `-` marks a folder as non-route code, excluded from the generated route tree).

## Routing

Routes are generated into `routeTree.gen.ts` by `@tanstack/router-plugin/vite`. The router (`lib/router.ts`) sets `defaultPreload: "intent"` and declares a typed `RouterContext` (`breadcrumbData`) via module augmentation, so individual routes can attach static breadcrumb metadata.

**Layout nesting:** `_dashboard.tsx` (auth-gated, wraps the sidebar/header/footer chrome) -> `_dashboard/_admin.tsx` / `_dashboard/_instructor.tsx` / `_dashboard/_student.tsx` (role-gated) -> leaf routes. The `_` prefix marks pathless layout routes.

A live lab session is *not* nested under the dashboard layout — `routes/lab/$labId/session/$labSessionId/` is a separate full-bleed route tree, since a running session is its own workspace (topology canvas, terminal, instructions panel) rather than a dashboard page.

**Loader + suspense pattern:** route `loader`s call `api.<resource>.get.ensureQueryData(queryClient)` to warm the cache before the route renders, and the component then reads with `useSuspenseQuery` — so there's no loading-spinner flash on first paint.

## Server State

There is no `hooks/queries/useGetX.ts` folder — instead `lib/api.ts` builds one typed client:

```ts
const client = treaty<App>(window.location.origin);
export default treatyQuery(client.api, { onErrorMessage: toast.error, onSuccessMessage: toast.success });
```

`treatyQuery` (`@jawit/query`) wraps the Eden-Treaty client in a `Proxy` that intercepts reserved property names (`useQuery`, `useSuspenseQuery`, `useInfiniteQuery`, `useMutation`, `queryOptions`, `ensureQueryData`, `invalidateQuery`, `setQueryData`, `usePagination`) and dispatches to real TanStack Query hooks, auto-deriving the query key from the Eden path + args, unwrapping the `{success, data, message}` envelope, and firing `sonner` toasts on success/error automatically. In practice every route just calls e.g. `api.lab({labId}).get.useSuspenseQuery()` or `api.file.upload.post.useMutation({...})` directly off the route tree.

The global `QueryClient` (`lib/query.ts`) is configured with `staleTime: 0`, no `refetchOnWindowFocus`/`refetchOnReconnect` — server truth for anything live is pushed over WebSocket instead of polled.

## Client State

`@jawit/zustand-helper` provides:
- `createSelectors(store)` — adds a `.use.<field>()` accessor so components avoid writing selector functions by hand.
- `createModalStore<TData>()(actions)` — a factory for modal-state stores from a declarative action-name list (a bare string key becomes a boolean toggle; others become nullable-data open/close slots). This is why most `-module/stores/*-modal-store.ts` files are one-liners.
- `createScopedStore`/`createScopedModalStore` — Context-scoped variants for stores that need per-route instances (`TopologyStoreProvider`, `LabChecksSessionProvider`, `LabSessionModalProvider`).

The one global store, `stores/auth-store.ts`, holds `{user, redirectUrl}` and exposes `refresh`/`login`/`logout`; it checks the `session` cookie via the browser Cookie Store API. `lib/ws.ts` subscribes to it outside React to drive the WebSocket connect/disconnect lifecycle.

## Real-time (Waycast over Socket.IO)

`lib/ws.ts` builds a `socket.io-client` instance (`path: "/ws"`, `parser: socket.io-msgpack-parser`, `autoConnect: false`) whose `auth` callback reads the `session` cookie on each (re)connect, wraps it in a `WaycastClientTransport`, and builds the typed Waycast client via `appRouter.buildClient({ transport })`. The socket connects once after login and disconnects on logout — not per-component.

`hooks/ws.ts` exposes four hooks on top of that client:

- **`useWSConnectionState()`** — subscribes to socket `connect`/`disconnect`, returns `{connected}`.
- **`useWSData(name, {params?, initialData?, enabled?})`** — subscribes to a push route, returns its latest value as React state; params are value-compared (JSON-stringified) so identical params don't resubscribe; unsubscribes on unmount or param change.
- **`useWSEvent(name, {params, handler})`** — same subscription mechanism as `useWSData` but fires a side-effect callback instead of holding state (kept in a ref so the effect doesn't need `handler` in its deps).
- **`useWSAction(name)`** — RPC-style: returns `{send, dispose}`; each `send()` call disposes any prior in-flight call first, and the hook auto-disposes on unmount.

**Example — the session take-over flow** (`routes/lab/$labId/session/$labSessionId/`): on mount, a `useWSAction("lab-session:[sessionId]:connect")` call soft-connects without taking over; if the server reports a conflict, a modal offers "Take Over Session" (which resends the same RPC with the take-over flag set). A paired `useWSEvent("lab-session:[sessionId]:client-change", ...)` listens for ownership changes pushed from the server — if some *other* client just took over, it shows an "this session has been taken over" modal instead. See [Communication Protocols](../communication/communication.md#the-session-take-over-race-fixed) for the server-side bug this pairs with.

Other examples in the same route: `useWSEvent("lab-session:[sessionId]:ended", ...)` navigates away and invalidates the relevant queries; `useWSEvent("lab-session:[sessionId]:checks", ...)` streams live check completions into the session's Zustand store.

## Onboarding Tour

A small `driver.js`-based tour lives under the lab-session route's `-module/onboarding/`: `buildTourSteps()` describes the session UI (topology canvas, device nodes, instructions panel, timer, submit button), and `useLabSessionTour()` wraps `driver({...}).drive()`. It auto-starts the first time a student opens a lab session (tracked via `localStorage`, key `vlab:onboarding:lab-session:v1`) and can be manually replayed from the UI. This is currently scoped only to the lab-session workspace — there's no tour elsewhere in the app.

## Authentication Flow

- `/login` (guarded by `guestRoute()` — redirects away if already authenticated) offers both a CAS SSO link (`/api/auth/cas`) and a password form (TanStack Form, TypeBox-validated via `@sinclair/typemap`).
- Route guards (`lib/middlewares.ts`), all reading synchronously from the auth store: `guestRoute()` (redirect if logged in), `protectedRoute()` (redirect to `/login` if not — gates the whole `_dashboard` layout), `privateRoute(roles)` (redirect if the user's role isn't in the allowed list — gates the `_admin`/`_instructor`/`_student` sub-layouts).
- `logout()` clears the session cookie, clears the TanStack Query cache, and sets `user: null` — which in turn disconnects the WebSocket via the store subscription in `lib/ws.ts`.
