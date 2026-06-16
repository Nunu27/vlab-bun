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
	const tag = (config?.detail?.tags ?? config?.tags)?.at(0);
	const entity: Entity | null = tag
		? { KEY: toKebabCase(tag), LABEL: tag }
		: null;

	return new Elysia(config).use(entityBase).derive(({ ENTITY }) => {
		if (!entity) return { ENTITY };

		entity.PARENT = ENTITY;
		return { ENTITY: entity };
	});
};
