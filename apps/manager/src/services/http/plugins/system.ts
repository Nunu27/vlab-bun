import { toKebabCase } from "@manager/utils/string";
import Elysia, { type ElysiaConfig } from "elysia";

interface Entity {
	LABEL: string;
	KEY: string;
	PARENT?: Entity;
}

const BASE_ENTITY: Entity = {
	KEY: "unknown",
	LABEL: "unknown",
};

const entityBase = new Elysia({ name: "entity-base" }).decorate(
	"ENTITY",
	BASE_ENTITY,
);

export const createRouter = <Prefix extends string = "">(
	config?: ElysiaConfig<Prefix>,
) => {
	return new Elysia(config)
		.use(entityBase)
		.decorate(({ ENTITY: parentEntity, ...rest }) => {
			const tag = config?.detail?.tags?.at(0);
			const PARENT = parentEntity === BASE_ENTITY ? undefined : parentEntity;
			const ENTITY: Entity | null = tag
				? {
						KEY: toKebabCase(tag),
						LABEL: config?.prefix ?? "unknown",
						PARENT,
					}
				: parentEntity;

			return {
				...rest,
				ENTITY,
			};
		});
};
