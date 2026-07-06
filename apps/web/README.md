# @vlab/web

## Overview

The frontend web application for the **vLab** project. It provides the user interface for students to interact with their virtual lab sessions, view topologies, access consoles (via Guacamole), and read lab modules. It also provides an admin interface for managing users, modules, and system settings.

## Tech Stack

- **Framework**: React 19
- **Bundler**: Vite
- **Routing**: [TanStack Router](https://tanstack.com/router) (File-based routing)
- **Data Fetching**: [TanStack Query](https://tanstack.com/query)
- **State Management**: [Zustand](https://zustand-demo.pmnd.rs/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **UI Components**: [shadcn/ui](https://ui.shadcn.com/) / Radix UI
- **Forms**: TanStack Form
- **Drag and Drop**: dnd-kit

## Key Features

- **Dynamic Lab Topologies**: Visualizing containerlab network graphs using interactive components.
- **Web-based Consoles**: Integration with Apache Guacamole for in-browser terminal access to lab nodes.
- **Real-time Updates**: Real-time state synchronization via WebSockets (`@vlab/ws` and `waycast`) for lab deployment progress and node health.
- **Markdown Modules**: Rendering interactive lab documentation and instructions using MDXEditor.

## Directory Structure

- `src/routes/`: File-based routing structure using TanStack Router.
- `src/components/`: Reusable UI components (including shadcn/ui components).
- `src/hooks/`: Custom React hooks.
- `src/stores/`: Global Zustand state stores.
- `src/shared/`: Shared utilities, icons, and configuration.
- `src/lib/`: Third-party library initializations and wrappers.
- `src/constants/`: Application-wide constants.

## Prerequisites & Configuration

The web frontend does not use environment variables. It automatically communicates with the Manager API using `window.location.origin` (or fallback config in development).

## Development & Scripts

| Command | Description |
|---|---|
| `bun run dev` | Start the Vite development server. |
| `bun run build` | Build the application for production. |
| `bun run preview` | Preview the production build locally. |
| `bun run test` | Run tests using Vitest. |
| `bun run typecheck` | Run TypeScript typechecking. |

