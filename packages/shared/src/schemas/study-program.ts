import { t } from "elysia/type-system";
import { NonEmptyString } from "./common";

export const CreateStudyProgramRequest = t.Object({
	name: NonEmptyString(),
	departmentId: t.String({ format: "uuid" })
});

export const UpdateStudyProgramRequest = t.Object({
	name: NonEmptyString(),
	departmentId: t.String({ format: "uuid" })
});
