import { createScopedModalStore } from "@jawit/zustand-helper/react";
import type { DepartmentItem } from "../types";

const { Provider, useContext } = createScopedModalStore<DepartmentItem>()([
	"create",
	"update",
	"delete",
]);

export const DepartmentModalProvider = Provider;
export const useDepartmentModalStore = useContext;
