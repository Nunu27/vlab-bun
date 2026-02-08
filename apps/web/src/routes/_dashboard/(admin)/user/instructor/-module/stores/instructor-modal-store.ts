import { createScopedModalStore } from "@jawit/zustand-helper/react";
import type { InstructorItem } from "../types";

const { Provider, useContext } = createScopedModalStore<InstructorItem>()([
	"create",
	"update",
	"delete",
]);

export const InstructorModalProvider = Provider;
export const useInstructorModalStore = useContext;
