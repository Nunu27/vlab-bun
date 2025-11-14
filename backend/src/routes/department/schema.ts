import { t } from "elysia/type-system";

export const CreateDepartmentRequest = t.Object({
	name: t.String({ minLength: 1 })
});

export const UpdateDepartmentRequest = t.Object({
	name: t.String({ minLength: 1 })
});
