import { t } from "elysia/type-system";

export const CreateDepartmentRequest = t.Object({
	name: t.String()
});

export const UpdateDepartmentRequest = t.Object({
	name: t.String()
});
