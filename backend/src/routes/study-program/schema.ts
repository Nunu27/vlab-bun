import { t } from "elysia/type-system";

export const CreateStudyProgramRequest = t.Object({
	name: t.String(),
	departmentId: t.String({ format: "uuid" })
});

export const UpdateStudyProgramRequest = t.Object({
	name: t.String(),
	departmentId: t.String({ format: "uuid" })
});
