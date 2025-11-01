import { degreeLevelEnum } from "@backend/db/schema/auth";
import { t } from "elysia";

export const CreateStudentRequest = t.Object({
	name: t.String(),
	email: t.String({ format: "email" }),
	nrp: t.String({ minLength: 10, maxLength: 10, format: "numeric" }),
	year: t.Integer({ min: 0 }),
	degreeLevel: t.UnionEnum(degreeLevelEnum.enumValues),
	studyProgramId: t.String({ format: "uuid" }),
	password: t.String({
		minLength: 8,
		maxLength: 128
	})
});

export const UpdateStudentRequest = t.Object({
	name: t.String(),
	email: t.String({ format: "email" }),
	nrp: t.String({ minLength: 10, maxLength: 10, format: "numeric" }),
	year: t.Integer({ min: 0 }),
	degreeLevel: t.UnionEnum(degreeLevelEnum.enumValues),
	studyProgramId: t.String({ format: "uuid" })
});
