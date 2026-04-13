import { createScopedModalStore } from "@jawit/zustand-helper/react";

const { Provider, useContext } = createScopedModalStore<{
	ids: string[];
	addCheck: () => void;
	removeCheck: (id: string) => void;
	removeSelf: () => void;
}>()(["configure"]);

export const LabChecksModalProvider = Provider;
export const useLabChecksModalStore = useContext;
