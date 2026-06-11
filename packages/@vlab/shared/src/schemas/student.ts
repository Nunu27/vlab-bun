import { Type as t } from "@sinclair/typebox";

import { NonEmptyString } from "./common";

export const CreateStudentRequest = t.Object({
	name: NonEmptyString(),
	email: t.String({ format: "email" }),
	nrp: t.String({ minLength: 10, maxLength: 10, format: "numeric" }),
	year: t.Integer({ min: 0 }),
	degreeLevel: t.Union([
		t.Literal("D3"),
		t.Literal("LJ"),
		t.Literal("D4"),
		t.Literal("S2"),
	]),
	studyProgramId: t.String({ format: "uuid" }),
	password: t.String({
		minLength: 8,
		maxLength: 128,
	}),
});

export const UpdateStudentRequest = t.Object({
	name: NonEmptyString(),
	email: t.String({ format: "email" }),
	nrp: t.String({ minLength: 10, maxLength: 10, format: "numeric" }),
	year: t.Integer({ min: 0 }),
	degreeLevel: t.Union([
		t.Literal("D3"),
		t.Literal("LJ"),
		t.Literal("D4"),
		t.Literal("S2"),
	]),
	studyProgramId: t.String({ format: "uuid" }),
});
