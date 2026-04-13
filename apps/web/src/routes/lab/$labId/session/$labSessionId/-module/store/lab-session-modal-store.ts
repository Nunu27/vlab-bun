import { createScopedModalStore } from "@jawit/zustand-helper/react";

const { Provider, useContext } = createScopedModalStore<string>()([
	"sidebar",
	"conflict",
	"overridden",
]);

export const LabSessionModalProvider = Provider;
export const useLabSessionModalStore = useContext;
