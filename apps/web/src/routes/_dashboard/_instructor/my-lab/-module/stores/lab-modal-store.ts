import { createScopedModalStore } from "@jawit/zustand-helper/react";
import type { LabItem } from "../types";

const { Provider, useContext } = createScopedModalStore<
	Pick<LabItem, "id" | "name">
>()(["delete", "duplicate"]);

export const LabModalProvider = Provider;
export const useLabModalStore = useContext;
