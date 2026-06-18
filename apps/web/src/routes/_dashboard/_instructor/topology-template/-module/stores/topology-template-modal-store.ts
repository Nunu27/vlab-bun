import { createScopedModalStore } from "@jawit/zustand-helper/react";
import type { TopologyTemplateItem } from "../types";

const { Provider, useContext } = createScopedModalStore<TopologyTemplateItem>()(
	["delete"],
);

export const TopologyTemplateModalProvider = Provider;
export const useTopologyTemplateModalStore = useContext;
