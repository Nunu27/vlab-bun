# Frontend Architecture

The vLab Web UI (`apps/web`) is a modern Single Page Application (SPA) designed for high performance and strict type safety. It provides the interface for both students taking labs and instructors managing them.

## Tech Stack

The frontend is built using the following core technologies:

- **Framework:** React 19
- **Build Tool:** Vite
- **Styling:** Tailwind CSS v4 alongside Shadcn UI components.
- **Routing:** [TanStack Router](https://tanstack.com/router/latest)
- **Data Fetching:** [TanStack Query](https://tanstack.com/query/latest)
- **State Management:** Zustand

## Page Structure & Routing

vLab uses **TanStack Router** for fully type-safe routing. This means that linking to a page with missing or incorrect path parameters will result in a TypeScript compiler error, ensuring broken links are caught at build time.

- **Route Configuration:** Defined in `apps/web/src/routes/`.
- **Page Layout:** We utilize nested routing to handle layouts (e.g., an authenticated dashboard layout wrapping specific dashboard pages).

*(Please refer to the `pages.excalidraw` diagram in this directory for a flow of pages from Login to Lab Session).*

## Data Management

The frontend distinguishes between two types of state: Server State and Client State.

### 1. Server State (TanStack Query)
Any data that originates from the Manager's database (e.g., User Profiles, Lab Templates, Historical Scores) is considered Server State. 

We use **TanStack Query** to fetch, cache, and synchronize this data. It handles background refetching, loading states, and error handling automatically. Instead of writing standard `fetch` calls, you should define a Custom Hook that wraps `useQuery` or `useMutation` (e.g., `useGetLabs()`).

### 2. Client State (Zustand)
Any data that exists purely in the user's browser and doesn't need to be persisted to the backend immediately (e.g., whether a sidebar is collapsed, or the current active tab in a complex form) is Client State.

We use **Zustand** for this. To simplify store creation, we leverage the `@jawit/zustand-helper` shared package.

## Real-time Telemetry (Waycast)

When a user is actively in a Lab Session, the frontend needs to reactively update node states (e.g., node health, interfaces). 

Instead of constantly polling the API via HTTP, the frontend establishes a WebSocket connection using the `packages/@vlab/ws` protocol. The Manager pushes telemetry events down this socket, and the frontend updates the UI reactively. This logic is accessed using custom Waycast hooks (e.g., `useWSData()` or `useWSEvent()`) that mount when the user enters the lab page and unmount when they leave.
