/** biome-ignore-all lint/suspicious/noExplicitAny: For loose typing */
import type { TProperties, TSchema } from "@sinclair/typebox";
import type {
	BaseChecks,
	BaseSources,
	CheckConfig,
	SourceConfig,
} from "../types";

export class EvaluationHandler<
	TId extends string = string,
	TSources extends BaseSources = Record<string, never>,
	TChecks extends BaseChecks = Record<string, never>,
> {
	public readonly sources = new Map<
		string,
		SourceConfig<TProperties, TSchema>
	>();
	public readonly checks = new Map<
		string,
		CheckConfig<string, TProperties, TProperties, TSchema>
	>();
	public readonly kinds: string[];

	constructor(
		public id: TId,
		config?: { kinds?: string[] },
	) {
		this.kinds = config?.kinds || [];
	}

	addSource<
		TName extends string,
		TParams extends TProperties,
		TData extends TSchema,
		TSource extends BaseSources = Record<
			TName,
			{ params: TParams; data: TData }
		>,
	>(
		name: TName,
		config: SourceConfig<TParams, TData>,
	): EvaluationHandler<
		TId,
		TSources extends Record<string, never> ? TSource : TSources & TSource,
		TChecks
	> {
		if (this.sources.has(name)) {
			throw new Error(`Source '${name}' is already registered.`);
		}

		this.sources.set(name, config as any);
		return this as any;
	}

	addCheck<
		TCheckName extends string,
		TSourceName extends string & keyof TSources,
		TCheckParams extends TProperties,
		TCheck extends BaseChecks = Record<TCheckName, { params: TCheckParams }>,
	>(
		name: TCheckName,
		config: CheckConfig<
			TSourceName,
			TCheckParams,
			TSources[TSourceName]["params"],
			TSources[TSourceName]["data"]
		>,
	): EvaluationHandler<
		TId,
		TSources,
		TChecks extends Record<string, never> ? TCheck : TChecks & TCheck
	> {
		if (!this.sources.has(config.source)) {
			throw new Error(`Source '${config.source}' is not registered.`);
		} else if (this.checks.has(name)) {
			throw new Error(`Check '${name}' is already registered.`);
		}

		this.checks.set(name, config as any);
		return this as any;
	}
}
