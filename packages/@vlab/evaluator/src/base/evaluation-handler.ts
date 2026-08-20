/** biome-ignore-all lint/suspicious/noExplicitAny: loose typing */
/** biome-ignore-all lint/complexity/noBannedTypes: default generics */
import type { Static, TObject, TProperties, TSchema } from "@sinclair/typebox";
import type { BaseContext, SourceChange } from "../types";

export class EvaluationHandler<
	TId extends string,
	TContext extends Record<string, any> = {},
	TSources extends Record<string, TSchema> = {},
	TChecks extends Record<string, TProperties> = {},
	/** Params a source requires from every check bound to it. */
	TSourceChecks extends Record<string, TProperties> = {},
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
	declare readonly __sourceChecks: TSourceChecks;

	constructor(public readonly id: TId) {}

	kinds(kinds: string[]): this {
		this._kinds = kinds;
		return this;
	}

	withContext<C extends Record<string, any>>(
		builder: (ctx: BaseContext) => C | Promise<C>,
		cleanup?: (ctx: BaseContext & C) => void | Promise<void>,
	): EvaluationHandler<TId, C, TSources, TChecks, TSourceChecks> {
		this._contextBuilder = builder as any;
		this._contextCleanup = cleanup as any;
		return this as unknown as EvaluationHandler<
			TId,
			C,
			TSources,
			TChecks,
			TSourceChecks
		>;
	}

	addSource<
		SId extends string,
		SData extends TSchema,
		SCParams extends TProperties = {},
	>(source: {
		id: SId;
		data: SData;
		/**
		 * Params this source needs from every check bound to it.
		 *
		 * Most sources omit this: a routing table is the same regardless of what
		 * is asked about it. A source that *measures* rather than enumerates
		 * (reachability, for instance) cannot produce data without knowing what
		 * to measure, so it declares the params it needs here. `addCheck` then
		 * requires every check on this source to supply them.
		 */
		checkParams?: SCParams;
		read?: (
			ctx: BaseContext & TContext,
			checkParams: Static<TObject<SCParams>>[],
		) => Static<SData> | Promise<Static<SData>>;
		listen?: (
			ctx: BaseContext & TContext,
			helpers: {
				notify: (data: Static<SData>) => void | Promise<void>;
				subscribe: <ReqSId extends keyof TSources & string>(
					sourceId: ReqSId,
					callback: (data: Static<TSources[ReqSId]>) => void | Promise<void>,
				) => Promise<() => void>;
				/**
				 * Fires whenever any *other* source in the session emits, on any
				 * node. Lets a source that has no event of its own re-measure when
				 * the lab's state changes, without polling: it piggybacks on the
				 * streams the session is already running for other checks.
				 */
				subscribeAny: (
					callback: (changed: SourceChange) => void | Promise<void>,
				) => () => void;
				checkParams: Static<TObject<SCParams>>[];
				reportError: (error?: unknown) => void;
			},
		) => (() => void) | Promise<() => void>;
	}): EvaluationHandler<
		TId,
		TContext,
		TSources & Record<SId, SData>,
		TChecks,
		TSourceChecks & Record<SId, SCParams>
	> {
		this._sources[source.id] = source;
		return this as unknown as EvaluationHandler<
			TId,
			TContext,
			TSources & Record<SId, SData>,
			TChecks,
			TSourceChecks & Record<SId, SCParams>
		>;
	}

	addCheck<
		CId extends string,
		SId extends keyof TSources & keyof TSourceChecks & string,
		CParams extends TProperties & TSourceChecks[SId],
	>(check: {
		id: CId;
		name: string;
		text: string;
		source: SId;
		params: CParams;
		/** When true, the check will not run again once its result becomes true. */
		oneTime?: boolean;
		handler: (
			ctx: BaseContext & TContext,
			params: Static<TObject<CParams>>,
			data: Static<TSources[SId]>,
		) => boolean | Promise<boolean>;
	}): EvaluationHandler<
		TId,
		TContext,
		TSources,
		TChecks & Record<CId, CParams>,
		TSourceChecks
	> {
		this._checks[check.id] = check;
		return this as unknown as EvaluationHandler<
			TId,
			TContext,
			TSources,
			TChecks & Record<CId, CParams>,
			TSourceChecks
		>;
	}
}
