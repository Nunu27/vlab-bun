import { t } from "elysia/type-system";
import { degreeLevelEnum } from "../enums";

export const CreateStudentRequest = t.Object({
	name: t.String({ minLength: 1 }),
	email: t.String({ format: "email" }),
	nrp: t.String({ minLength: 10, maxLength: 10, format: "numeric" }),
	year: t.Integer({ min: 0 }),
	degreeLevel: t.UnionEnum(degreeLevelEnum),
	studyProgramId: t.String({ format: "uuid" }),
	password: t.String({
		minLength: 8,
		maxLength: 128
	})
});

export const UpdateStudentRequest = t.Object({
	name: t.String({ minLength: 1 }),
	email: t.String({ format: "email" }),
	nrp: t.String({ minLength: 10, maxLength: 10, format: "numeric" }),
	year: t.Integer({ min: 0 }),
	degreeLevel: t.UnionEnum(degreeLevelEnum),
	studyProgramId: t.String({ format: "uuid" })
});
