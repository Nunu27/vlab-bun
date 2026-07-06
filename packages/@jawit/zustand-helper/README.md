# @jawit/zustand-helper

## Overview

A collection of high-powered utilities to supercharge Zustand stores in React applications.

## Installation

```bash
bun add @jawit/zustand-helper
```

## Key Features

- **Auto-generated Selectors**: Automatically append a `.use.property()` selector to your store.
- **Modal Stores**: Specialized store factories for managing modal/drawer UI states effortlessly.
- **Scoped Context Stores**: Easily inject and scope Zustand stores into a React Component Tree using Context.

## Usage & API Examples

### 1. Auto-generated Selectors

Avoid writing boilerplate selectors for your state fields.

```tsx
import { create } from "zustand";
import { createSelectors } from "@jawit/zustand-helper";

const useBearStoreBase = create<{ bears: number; increase: () => void }>((set) => ({
  bears: 0,
  increase: () => set((state) => ({ bears: state.bears + 1 })),
}));

// Enhance the store
export const useBearStore = createSelectors(useBearStoreBase);

// Usage in a component without manual selectors
function BearCounter() {
  const bears = useBearStore.use.bears();
  const increase = useBearStore.use.increase();
  
  return <button onClick={increase}>{bears} bears</button>;
}
```

### 2. Modal Stores

Quickly generate stores that manage boolean/data states for Modals.

```tsx
import { createModalStore } from "@jawit/zustand-helper";

type ModalData = { id: string };

// Define a store with 'create' (boolean) and 'edit' (data attached) actions
export const useModals = createModalStore<ModalData>()([
  "create",
  ["edit", null] // 'edit' can hold ModalData or null
]);

function App() {
  const isCreateOpen = useModals((s) => s.create);
  const editData = useModals((s) => s.edit);
  
  const actions = useModals((s) => s.actions);

  return (
    <>
      <button onClick={() => actions.create.open()}>Open Create Modal</button>
      <button onClick={() => actions.edit.open({ id: "123" })}>Open Edit Modal</button>
    </>
  );
}
```

### 3. Scoped Stores (React Context)

When you need a Zustand store that is strictly scoped to a specific component subtree (e.g., a complex data table).

```tsx
import { createScopedStore } from "@jawit/zustand-helper/react";
import { create } from "zustand";

interface Props { initialCount: number }

const { Provider, useContext } = createScopedStore((props: Props) => 
  create<{ count: number }>((set) => ({
    count: props.initialCount
  }))
);

function ScopedCounter() {
  // Inherits the .use selector magic automatically
  const count = useContext().use.count();
  return <div>{count}</div>;
}

export function App() {
  return (
    <Provider initialCount={10}>
      <ScopedCounter />
    </Provider>
  );
}
```

## Development & Scripts

This package is consumed directly from source and has no package-specific build or development scripts.
