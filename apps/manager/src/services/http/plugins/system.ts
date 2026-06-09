import { toKebabCase } from "@manager/utils/string";
import Elysia, { type ElysiaConfig } from "elysia";

interface Entity {
	label: string;
	key: string;
}

type EntityPlugin = {
	entity: Entity;
};

export const createRouter = <Prefix extends string = "">(
	config?: ElysiaConfig<Prefix>,
) => {
	const tag = config?.detail?.tags?.at(0);
	const entity = tag ? { key: toKebabCase(tag), label: tag } : null;

	return new Elysia(config).resolve(() => {
		if (entity) return { entity };
		return {} as EntityPlugin;
	});
};
