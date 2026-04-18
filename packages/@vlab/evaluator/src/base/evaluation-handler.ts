/** biome-ignore-all lint/suspicious/noExplicitAny: loose typing */
/** biome-ignore-all lint/complexity/noBannedTypes: default generics */
import type { Static, TObject, TProperties, TSchema } from "@sinclair/typebox";
import type { BaseContext } from "../types";

export class EvaluationHandler<
	TId extends string,
	TContext extends Record<string, any> = {},
	TSources extends Record<string, TSchema> = {},
	TChecks extends Record<string, TProperties> = {},
> {
	// Internal state
	public _kinds: string[] = [];
	public _contextBuilder?: (ctx: BaseContext) => TContext | Promise<TContext>;
	public _contextCleanup?: (
		ctx: BaseContext & TContext,
	) => void | Promise<void>;
	public _sources: Record<string, any> = {};
	public _checks: Record<string, any> = {};

	// Phantom types for generics extraction
	declare readonly __context: TContext;
	declare readonly __sources: TSources;
	declare readonly __checks: TChecks;

	constructor(public readonly id: TId) {}

	kinds(kinds: string[]): this {
		this._kinds = kinds;
		return this;
	}

	withContext<C extends Record<string, any>>(
		builder: (ctx: BaseContext) => C | Promise<C>,
		cleanup?: (ctx: BaseContext & C) => void | Promise<void>,
	): EvaluationHandler<TId, C, TSources, TChecks> {
		this._contextBuilder = builder as any;
		this._contextCleanup = cleanup as any;
		return this as unknown as EvaluationHandler<TId, C, TSources, TChecks>;
	}

	addSource<SId extends string, SData extends TSchema>(source: {
		id: SId;
		data: SData;
		read?: (
			ctx: BaseContext & TContext,
		) => Static<SData> | Promise<Static<SData>>;
		listen?: (
			ctx: BaseContext & TContext,
			notify: (data: Static<SData>) => void | Promise<void>,
			subscribe: <ReqSId extends keyof TSources & string>(
				sourceId: ReqSId,
				callback: (data: Static<TSources[ReqSId]>) => void | Promise<void>,
			) => Promise<() => void>,
		) => (() => void) | Promise<() => void>;
	}): EvaluationHandler<TId, TContext, TSources & Record<SId, SData>, TChecks> {
		this._sources[source.id] = source;
		return this as unknown as EvaluationHandler<
			TId,
			TContext,
			TSources & Record<SId, SData>,
			TChecks
		>;
	}

	addCheck<
		CId extends string,
		SId extends keyof TSources,
		CParams extends TProperties,
	>(check: {
		id: CId;
		name: string;
		text: string;
		source: SId;
		params: CParams;
		handler: (
			ctx: BaseContext & TContext,
			params: Static<TObject<CParams>>,
			data: Static<TSources[SId]>,
		) => boolean | Promise<boolean>;
	}): EvaluationHandler<
		TId,
		TContext,
		TSources,
		TChecks & Record<CId, CParams>
	> {
		this._checks[check.id] = check;
		return this as unknown as EvaluationHandler<
			TId,
			TContext,
			TSources,
			TChecks & Record<CId, CParams>
		>;
	}
}
