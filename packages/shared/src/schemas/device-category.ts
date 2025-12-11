import { t } from "elysia/type-system";

export const CreateDeviceCategoryRequest = t.Object({
	name: t.String({ minLength: 1 }),
	color: t.String({ minLength: 1 })
});

export const UpdateDeviceCategoryRequest = t.Object({
	name: t.String({ minLength: 1 }),
	color: t.String({ minLength: 1 })
});
