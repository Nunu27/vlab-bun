import { createScopedModalStore } from "@jawit/zustand-helper/react";
import type { StudyProgramItem } from "../types";

const { Provider, useContext } = createScopedModalStore<StudyProgramItem>()([
	"create",
	"update",
	"delete",
]);

export const StudyProgramModalProvider = Provider;
export const useStudyProgramModalStore = useContext;
