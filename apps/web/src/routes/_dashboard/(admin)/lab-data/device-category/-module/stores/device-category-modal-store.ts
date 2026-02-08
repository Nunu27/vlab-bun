import { createScopedModalStore } from "@jawit/zustand-helper/react";
import type { DeviceCategoryItem } from "../types";

const { Provider, useContext } = createScopedModalStore<DeviceCategoryItem>()([
	"create",
	"update",
	"delete",
]);

export const DeviceCategoryModalProvider = Provider;
export const useDeviceCategoryModalStore = useContext;
