# vLab System Documentation

Welcome to the internal system documentation for vLab. This documentation is structured to help future developers rapidly build a mental model of the vLab monorepo and understand its core architecture.

## Getting Started

If you are new to the project, we highly recommend reading the documentation in the following order:

1. **[Codebase Tour](./codebase-tour/codebase-tour.md)**  
   Start here. A guided tour of the monorepo explaining the role of `apps/manager`, `apps/worker`, `apps/web`, and `packages/*`.

2. **[System Architecture](./architecture/architecture.md)**  
   A deep dive into the Manager-Worker architecture, why it was chosen, and the orchestration flow of a lab session.

3. **[Communication Protocols](./communication/communication.md)**  
   Understand how the Manager and Worker communicate via gRPC, and how the Manager and Web UI communicate via Waycast (WebSockets).

4. **[Data Model & Database](./data-model/data-model.md)**  
   Learn about the core entities (Users, Labs, Sessions, etc.), PostgreSQL, and how Drizzle ORM is utilized in the Manager.

5. **[Frontend Architecture](./frontend/frontend.md)**  
   An overview of the React 19 web application, state management, routing, and data fetching.

## Core Engines

Once you have a grasp on the high-level architecture, you can dive into the specifics of vLab's core capabilities:

- **[Containerlab Integration](./containerlab/containerlab.md)**: How vLab parses topology files, interfaces with Containerlab on the Worker, and monitors container lifecycle events and interfaces.
- **[Lab Evaluation Engine](./evaluator/evaluator.md)**: How the system evaluates lab session rules and calculates scores.

## Additional References

- **[External Libraries](./external-libs/external-libs.md)**: Details on specific vendor integrations (e.g., Mikro-RouterOS).
- **[Load Testing](./load-testing/load-testing.md)**: System benchmarks, strategies, and performance expectations.

---
*Note: Diagrams are stored as `.excalidraw` files and can be viewed or edited directly within VS Code using the [Excalidraw extension](https://marketplace.visualstudio.com/items?itemName=pomdtr.excalidraw-editor).*
