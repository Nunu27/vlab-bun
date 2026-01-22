// Import TypeBox types
import { type TProperties, type TObject, type Static, Type } from "typebox";

type MaybePromise<T> = Promise<T> | T;
type VoidCallback = () => void;
type Callback<T> = (data: T) => void;

interface DataSource<TDataSchema extends TProperties> {
	name: string;
	schema: TDataSchema;
	listen: <TContext>(
		ctx: TContext,
		callback: Callback<Static<TObject<TDataSchema>>>
	) => VoidCallback;
	read: <TContext>(ctx: TContext) => MaybePromise<Static<TObject<TDataSchema>>>;
}

interface CheckerDefinition<TSourceData = unknown, TParams = unknown> {
	type: string;
	sourceName: string;
	handler: (args: { params: TParams; data: TSourceData }) => boolean | null;
}

interface CheckConfig<TParams = unknown> {
	id: string;
	type: string;
	params: TParams;
}

export interface CheckResult {
	checkId: string;
	type: string;
	result: boolean;
	data: unknown;
	timestamp: number;
}

// ============================================================================
// Evaluator System
// ============================================================================

class EvaluatorSystem<
	TContext,
	TDataSources extends Record<string, DataSource<any>>,
	TCheckConfigs extends { type: string; params: unknown }
> {
	constructor(
		public readonly contextBuilder: (node: unknown) => TContext,
		public readonly disposeContext: (ctx: TContext) => void,
		public readonly dataSources: TDataSources,
		public readonly checkerDefs: Map<string, CheckerDefinition<any, any>>
	) {}

	public init(options: {
		node: unknown;
		checks: Array<TCheckConfigs & { id: string }>;
	}): EvaluatorExecutor<TContext, TDataSources, TCheckConfigs> {
		return new EvaluatorExecutor(this, options.node, options.checks);
	}
}

// ============================================================================
// Builder
// ============================================================================

class EvaluatorBuilder<
	TContext,
	TDataSources extends Record<string, DataSource<any>> = {},
	TCheckConfigs extends { type: string; params: unknown } = never
> {
	private readonly _dispose: (ctx: TContext) => void;
	private _dataSources: TDataSources;
	private _checkerDefs: Map<string, CheckerDefinition<any, any>>;

	constructor(
		private readonly _contextBuilder: (node: any) => TContext,
		dataSources?: TDataSources,
		checkerDefs?: Map<string, CheckerDefinition<any, any>>,
		dispose?: (ctx: TContext) => void
	) {
		this._dataSources = dataSources ?? ({} as TDataSources);
		this._checkerDefs = checkerDefs ?? new Map();
		this._dispose = dispose ?? (() => {});
	}

	public dispose(
		disposeFn: (ctx: TContext) => void
	): EvaluatorBuilder<TContext, TDataSources, TCheckConfigs> {
		return new EvaluatorBuilder(
			this._contextBuilder,
			this._dataSources,
			this._checkerDefs,
			disposeFn
		);
	}

	public addDataSource<
		TName extends string,
		TDataSchema extends TProperties
	>(def: {
		name: TName;
		schema: TDataSchema;
		listen: (
			ctx: TContext,
			callback: Callback<Static<TObject<TDataSchema>>>
		) => VoidCallback;
		read: (ctx: TContext) => MaybePromise<Static<TObject<TDataSchema>>>;
	}): EvaluatorBuilder<
		TContext,
		TDataSources & Record<TName, DataSource<TDataSchema>>,
		TCheckConfigs
	> {
		const newSource = {
			name: def.name,
			schema: def.schema,
			listen: def.listen,
			read: def.read
		};
		(this._dataSources as any)[def.name] = newSource;

		return this as unknown as EvaluatorBuilder<
			TContext,
			TDataSources & Record<TName, DataSource<TDataSchema>>,
			TCheckConfigs
		>;
	}

	public addCheckerDefinition<
		TType extends string,
		TSourceName extends keyof TDataSources & string,
		TParamsSchema extends TProperties
	>(def: {
		type: TType;
		source: TSourceName;
		schema: TParamsSchema;
		handler: (args: {
			params: Static<TObject<TParamsSchema>>;
			data: TDataSources[TSourceName] extends DataSource<infer TDataSchema>
				? Static<TObject<TDataSchema>>
				: never;
		}) => boolean | null;
	}): EvaluatorBuilder<
		TContext,
		TDataSources,
		TCheckConfigs | { type: TType; params: Static<TObject<TParamsSchema>> }
	> {
		if (this._checkerDefs.has(def.type)) {
			throw new Error(`Checker type "${def.type}" is already defined`);
		}

		this._checkerDefs.set(def.type, {
			type: def.type,
			sourceName: def.source,
			handler: def.handler
		});

		return this as unknown as EvaluatorBuilder<
			TContext,
			TDataSources,
			TCheckConfigs | { type: TType; params: Static<TObject<TParamsSchema>> }
		>;
	}

	public build(): EvaluatorSystem<TContext, TDataSources, TCheckConfigs> {
		return new EvaluatorSystem(
			this._contextBuilder,
			this._dispose,
			this._dataSources,
			this._checkerDefs
		);
	}
}

// ============================================================================
// Runtime Executor
// ============================================================================

class EvaluatorExecutor<
	TContext,
	TDataSources extends Record<string, DataSource<any>>,
	TCheckConfigs extends { type: string; params: unknown }
> {
	private context: TContext;
	private activeCleanupFns: VoidCallback[] = [];
	private isRunning = false;
	private changeListeners: Set<(result: CheckResult) => void> = new Set();
	private sourceToCheckMap: Map<
		string,
		Array<CheckConfig<any> & { def: CheckerDefinition<any, any> }>
	> = new Map();

	constructor(
		private system: EvaluatorSystem<TContext, TDataSources, TCheckConfigs>,
		node: unknown,
		private checks: Array<TCheckConfigs & { id: string }>
	) {
		this.context = system.contextBuilder(node);
		this.buildOptimizationMap();
	}

	private buildOptimizationMap() {
		for (const check of this.checks) {
			const def = this.system.checkerDefs.get(check.type);
			if (!def) continue;

			if (!this.sourceToCheckMap.has(def.sourceName)) {
				this.sourceToCheckMap.set(def.sourceName, []);
			}

			const normalizedParams = check.params || {};

			this.sourceToCheckMap.get(def.sourceName)!.push({
				id: check.id,
				type: check.type,
				params: normalizedParams,
				def
			});
		}
	}

	public async check(): Promise<CheckResult[]> {
		const results: CheckResult[] = [];

		await Promise.all(
			this.checks.map(async (check) => {
				const def = this.system.checkerDefs.get(check.type);
				if (!def) return;

				const source = this.system.dataSources[def.sourceName];
				if (!source) return;

				try {
					// Await the data source read (handles both sync and async return values)
					const currentData = await source.read(this.context);

					const result = def.handler({
						params: check.params || {},
						data: currentData
					});

					if (result !== null) {
						results.push({
							checkId: check.id,
							type: check.type,
							result,
							data: currentData,
							timestamp: Date.now()
						});
					}
				} catch (error) {
					console.error(
						`Error reading source ${def.sourceName} for check ${check.id}:`,
						error
					);
				}
			})
		);

		return results;
	}

	public start() {
		if (this.isRunning) return;
		this.isRunning = true;

		for (const sourceName of this.sourceToCheckMap.keys()) {
			const sourceDef = this.system.dataSources[sourceName];
			if (sourceDef) {
				const cleanup = sourceDef.listen(this.context, (data) => {
					this.handleSource(sourceName, data);
				});
				this.activeCleanupFns.push(cleanup);
			}
		}
	}

	public stop() {
		if (!this.isRunning) return;
		this.isRunning = false;

		this.activeCleanupFns.forEach((fn) => fn());
		this.activeCleanupFns = [];
	}

	public dispose() {
		this.stop();
		this.system.disposeContext(this.context);
		this.changeListeners.clear();
	}

	public onChange(callback: (result: CheckResult) => void): VoidCallback {
		this.changeListeners.add(callback);
		return () => this.changeListeners.delete(callback);
	}

	private handleSource(sourceName: string, data: unknown) {
		const relevantChecks = this.sourceToCheckMap.get(sourceName);
		if (!relevantChecks) return;

		for (const check of relevantChecks) {
			const result = check.def.handler({ params: check.params, data });
			if (result === null) continue;

			this.notify({
				checkId: check.id,
				type: check.type,
				result,
				data,
				timestamp: Date.now()
			});
		}
	}

	private notify(result: CheckResult) {
		this.changeListeners.forEach((cb) => cb(result));
	}
}

// ============================================================================
// Example Usage
// ============================================================================

type Node = { id: string };

const valueSchema = {
	val: Type.Number(),
	ts: Type.Number()
} as const;

const evaluatorSystem = new EvaluatorBuilder((node: Node) => ({
	nodeId: node.id,
	timers: [] as NodeJS.Timeout[]
}))
	.dispose((ctx) => ctx.timers.forEach((t) => clearTimeout(t)))
	.addDataSource({
		name: "onValue",
		schema: valueSchema,
		listen: (ctx, cb) => {
			const t = setInterval(
				() => cb({ val: Math.random() * 100, ts: Date.now() }),
				1000
			);
			ctx.timers.push(t);
			return () => clearInterval(t);
		},
		read: async (ctx) => {
			// Simulate Async Read
			return Promise.resolve({ val: Math.random() * 100, ts: Date.now() });
		}
	})
	.addDataSource({
		name: "onTick",
		schema: {},
		listen: (ctx, cb) => {
			const t = setInterval(() => cb({}), 2000);
			ctx.timers.push(t);
			return () => clearInterval(t);
		},
		read: (ctx) => ({})
	})
	.addCheckerDefinition({
		type: "threshold",
		source: "onValue",
		schema: { min: Type.Number(), max: Type.Number() },
		handler: ({ params, data }) =>
			data.val >= params.min && data.val <= params.max
	})
	.addCheckerDefinition({
		type: "isTick",
		source: "onTick",
		schema: {},
		handler: ({ params, data }) => {
			if (Math.random() > 0.5) return null;
			return true;
		}
	})
	.build();

const executor = evaluatorSystem.init({
	node: { id: "server-01" },
	checks: [
		{
			id: "chk_1",
			type: "threshold",
			params: { min: 80, max: 100 }
		},
		{
			id: "chk_2",
			type: "isTick",
			params: {}
		}
	]
});

// Check is now async
executor.check().then((results) => {
	console.log("Immediate Check Results:", results);
});

executor.onChange((res) =>
	console.log(`[Result] ${res.checkId}: ${res.result}`)
);
executor.start();

const result = await executor.check();

setTimeout(() => executor.dispose(), 3500);

export { EvaluatorBuilder, EvaluatorSystem, EvaluatorExecutor };
