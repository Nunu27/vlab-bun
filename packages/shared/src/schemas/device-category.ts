import { t } from "elysia/type-system";

export const CreateDeviceCategoryRequest = t.Object({
	name: t.String({ minLength: 1 }),
	icon: t.File({ type: "image/*", maxSize: "10m" })
});

export const UpdateDeviceCategoryRequest = t.Object({
	name: t.String({ minLength: 1 }),
	icon: t.Optional(t.File({ type: "image/*", maxSize: "10m" }))
});
