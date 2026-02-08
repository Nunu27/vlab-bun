import { createScopedModalStore } from "@jawit/zustand-helper/react";
import type { StudentItem } from "../types";

const { Provider, useContext } = createScopedModalStore<StudentItem>()([
	"create",
	"update",
	"delete",
]);

export const StudentModalProvider = Provider;
export const useStudentModalStore = useContext;
