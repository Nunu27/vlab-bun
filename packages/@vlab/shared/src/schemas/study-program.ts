import { Type as t } from "@sinclair/typebox";
import { NonEmptyString } from "./common";

export const CreateStudyProgramRequest = t.Object({
	name: NonEmptyString(),
	departmentId: t.String({ format: "uuid" }),
});

export const UpdateStudyProgramRequest = t.Object({
	name: NonEmptyString(),
	departmentId: t.String({ format: "uuid" }),
});
