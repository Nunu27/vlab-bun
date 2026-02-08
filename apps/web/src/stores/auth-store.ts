import type {
	ExtractTreatyData,
	ExtractTreatyParams,
} from "@jawit/query/types";
import { createSelectors, type Store } from "@jawit/zustand-helper";
import { errorHandler } from "@web/helper/error";
import api from "@web/lib/api";
import { create } from "zustand";

type LoginData = ExtractTreatyParams<typeof api.auth.login.post>;
type AuthUser = ExtractTreatyData<typeof api.auth.me.get>;

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
			const cookie = await cookieStore.get("session");
			if (!cookie) return set({ user: null, redirectUrl: undefined });

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
					await cookieStore.delete("session");
					set({ user: null, redirectUrl: data });
				},
			});
		},
	},
}));

export const useAuthStore = createSelectors(store);
