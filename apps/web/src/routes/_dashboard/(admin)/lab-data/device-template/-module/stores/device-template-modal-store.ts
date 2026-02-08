import { createScopedModalStore } from "@jawit/zustand-helper/react";
import type { DeviceTemplateItem } from "../types";

const { Provider, useContext } = createScopedModalStore<DeviceTemplateItem>()([
	"delete",
]);

export const DeviceTemplateModalProvider = Provider;
export const useDeviceTemplateModalStore = useContext;
