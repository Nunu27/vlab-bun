// import { create } from 'zustand';

// interface TestDeviceState {
//   open: boolean;
//   token: string | undefined;
//   dispose: VoidFunction | undefined;
//   // logs: Logs<'info' | 'warn' | 'error'>;
//   // issue: Logs<'warn' | 'error'>;
// }

// interface TestDeviceActions {
//   log: (type: 'info' | 'warn' | 'error', message: string) => void;
//   setOpen: (open: boolean) => void;
//   setToken: (token: string) => void;
//   setDispose: (dispose?: () => void) => void;
//   reset: VoidFunction;
// }

// type TestDeviceStore = Store<TestDeviceState, TestDeviceActions>;

// const initialState: TestDeviceState = {
//   open: false,
//   token: undefined,
//   dispose: undefined,
//   logs: [],
//   issue: [],
// };

// const { Provider, useContext } = createScopedStore(() =>
//   create<TestDeviceStore>()((set, get) => ({
//     ...initialState,
//     actions: {
//       log: (type, message) =>
//         set((state) => ({
//           logs: [...state.logs, { type, message }],
//         })),
//       setOpen: (open) => {
//         if (open) return set({ open });
//         else return get().actions.reset();
//       },
//       setToken: (token) => set({ token }),
//       setDispose: (dispose) => set({ dispose }),
//       reset: () => {
//         get().dispose?.();
//         set({ ...initialState });
//       },
//     },
//   })),
// );

// export const TestDeviceStoreProvider = Provider;
// export const useTestDeviceStore = useContext;
