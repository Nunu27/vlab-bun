import { toKebabCase } from "@api/utils/string";
import Elysia, { type ElysiaConfig } from "elysia";

export interface Entity {
	label: string;
	key: string;
}

export const createRouter = <const BasePath extends string = "">(
	options?: ElysiaConfig<BasePath>,
) => {
	const tag = options?.detail?.tags?.at(0);
	const entity = tag ? { label: tag, key: toKebabCase(tag) } : null;

	return new Elysia(options).derive(() => {
		if (entity) return { entity };
		else return {} as { entity: Entity };
	});
};
