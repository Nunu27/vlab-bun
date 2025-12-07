import { t } from "elysia/type-system";

export const CreateStudyProgramRequest = t.Object({
	name: t.String({ minLength: 1 }),
	departmentId: t.String({ format: "uuid" })
});

export const UpdateStudyProgramRequest = t.Object({
	name: t.String({ minLength: 1 }),
	departmentId: t.String({ format: "uuid" })
});
