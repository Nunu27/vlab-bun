import { createScopedModalStore } from "@jawit/zustand-helper/react";
import type { AdminItem } from "../types";

const { Provider, useContext } = createScopedModalStore<AdminItem>()([
	"create",
	"update",
	"delete",
]);

export const AdminModalProvider = Provider;
export const useAdminModalStore = useContext;
