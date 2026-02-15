import { createScopedModalStore } from "@jawit/zustand-helper/react";

type UserBasicItem = { id: string; username?: string; name?: string };

const { Provider, useContext } = createScopedModalStore<UserBasicItem>()([
	"changePassword",
]);

export const UserPasswordModalProvider = Provider;
export const useUserPasswordModalStore = useContext;
