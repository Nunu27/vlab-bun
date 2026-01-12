import { errorHandler } from '@frontend/helper/error';
import { createSelectors } from '@frontend/helper/store';
import api from '@frontend/lib/api';
import type { TreatyData } from '@frontend/types/api';
import type { Store } from '@frontend/types/store';
import { create } from 'zustand';

type LoginData = Parameters<typeof api.auth.login.post>[0];
type AuthUser = TreatyData<typeof api.auth.me.get>['data'];

interface AuthActions {
  refresh(): Promise<void>;
  login(credentials: LoginData): Promise<void>;
  logout(): Promise<void>;
}

interface AuthState {
  user?: AuthUser | null;
  redirectUrl?: string;
}

type AuthStore = Store<AuthState, AuthActions>;

const store = create<AuthStore>()((set, get) => ({
  user: undefined,
  redirectUrl: undefined,
  actions: {
    refresh: async () => {
      const token = await cookieStore.get('session');
      if (!token) return set({ user: null, redirectUrl: undefined });

      await errorHandler(api.auth.me.get(), {
        callback: ({ data }) => set({ user: data, redirectUrl: undefined }),
      });
    },
    login: async (credentials) => {
      await errorHandler(api.auth.login.post(credentials), {
        callback: get().actions.refresh,
      });
    },
    logout: async () => {
      await errorHandler(api.auth.logout.post(), {
        callback: async ({ data }) => {
          await cookieStore.delete('session');
          set({ user: null, redirectUrl: data });
        },
      });
    },
  },
}));

export const useAuthStore = createSelectors(store);
