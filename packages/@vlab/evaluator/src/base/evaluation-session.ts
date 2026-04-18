/** biome-ignore-all lint/suspicious/noExplicitAny: loose typing */
import type Dockerode from "dockerode";
import type { AnyHandler, BaseContext, SessionCheckPayload } from "../types";
import type { Evaluator } from "./evaluator";

export class EvaluationSession<THandlers extends Record<string, AnyHandler>> {
	private checkDefinitions: SessionCheckPayload<THandlers>[];

	// State maps
	private contexts = new Map<string, any>();
	private cleanups = new Map<string, () => void | Promise<void>>();
	private listeners = new Map<string, () => void | Promise<void>>(); // Cleanups for sources
	private checkResults = new Map<string, boolean>();
	private onChangeCallbacks: Array<(checkId: string, result: boolean) => void> =
		[];
	private startedSources = new Set<string>();

	// Add an exact tracker to prevent memory leaks from recursive subscriptions
	private sessionEmitterCleanups: Array<() => void> = [];

	// Dependency optimization Maps
	private sourceToCheckMap = new Map<
		string,
		SessionCheckPayload<THandlers>[]
	>();
	private checksToRun = new Map<
		string,
		{ handler: AnyHandler; checkDef: any; sessionParams: any }
	>();

	constructor(
		private evaluator: Evaluator<THandlers>,
		private docker: Dockerode,
		private nodeMapping: Record<string, import("../types").NodeInfo>,
		checks: SessionCheckPayload<THandlers>[],
		private healthHooks?: {
			isNodeHealthy: (nodeId: string) => boolean;
			waitForHealth: (nodeId: string, onHealthy: () => void) => () => void;
		},
	) {
		this.checkDefinitions = checks;
		this.mapDependencies();
	}

	private mapDependencies() {
		for (const sessionCheck of this.checkDefinitions) {
			const [hId, cId] = (sessionCheck.checkId as string).split(".");
			if (!hId || !cId) continue;

			const handler = this.evaluator.handlers[hId];
			if (!handler) continue;

			const checkDef = handler._checks[cId];
			if (!checkDef) continue;

			const sourceKey = `${hId}.${checkDef.source}::${sessionCheck.nodeId}`;

			// Map which sources trigger which checks
			let mappedChecks = this.sourceToCheckMap.get(sourceKey);
			if (!mappedChecks) {
				mappedChecks = [];
				this.sourceToCheckMap.set(sourceKey, mappedChecks);
			}
			mappedChecks.push(sessionCheck);

			// Store runnable definition
			this.checksToRun.set(sessionCheck.id as string, {
				handler,
				checkDef,
				sessionParams: sessionCheck.params,
			});
		}
	}

	private async getContext(nodeId: string, handlerId: string) {
		const contextKey = `${nodeId}::${handlerId}`;
		if (this.contexts.has(contextKey)) return this.contexts.get(contextKey);
		if (!this.nodeMapping[nodeId]) {
			throw new Error(`Node ${nodeId} not found in node mapping`);
		}

		const handler = this.evaluator.handlers[handlerId];
		const baseContext: BaseContext = {
			docker: this.docker,
			node: this.nodeMapping[nodeId],
		};

		if (!handler) return baseContext;

		let extendedCtx = { ...baseContext };

		if (handler._contextBuilder) {
			const ext = await handler._contextBuilder(baseContext);
			extendedCtx = { ...extendedCtx, ...ext };
		}

		this.contexts.set(contextKey, extendedCtx);
		if (handler._contextCleanup) {
			this.cleanups.set(contextKey, () => {
				if (handler._contextCleanup) {
					return handler._contextCleanup(extendedCtx);
				}
			});
		}
		return extendedCtx;
	}

	private async waitNodeHealth(nodeId: string) {
		if (!this.healthHooks) return;
		if (this.healthHooks.isNodeHealthy(nodeId)) return;

		return new Promise<void>((resolve) => {
			const cancel = this.healthHooks?.waitForHealth(nodeId, resolve);
			this.cleanups.set(`health-wait::${nodeId}`, () => {
				cancel?.();
				resolve();
			});
		});
	}

	onChange(cb: (checkId: string, result: boolean) => void) {
		this.onChangeCallbacks.push(cb);
	}

	private async startSource(nodeId: string, sourceId: string) {
		const sourceKey = `${sourceId}::${nodeId}`;
		if (this.startedSources.has(sourceKey)) return;
		this.startedSources.add(sourceKey);

		const [hId, sId] = sourceId.split(".");
		if (!hId || !sId) return;

		const handler = this.evaluator.handlers[hId];
		if (!handler) return;

		const sourceDef = handler._sources[sId];
		if (!sourceDef) return;

		await this.waitNodeHealth(nodeId);

		let ctx: any;
		try {
			ctx = await this.getContext(nodeId, hId);
		} catch (err) {
			console.error(`Failed to get context for ${sourceKey}`, err);
			return;
		}

		let emitters = this.evaluator._emitters.get(sourceKey);
		if (!emitters) {
			emitters = [];
			this.evaluator._emitters.set(sourceKey, emitters);
		}

		// Register check evaluator as a listener
		const activeChecks = this.sourceToCheckMap.get(sourceKey) || [];
		if (activeChecks.length > 0) {
			const checkCb = async (data: any) => {
				for (const sessionCheck of activeChecks) {
					const runDef = this.checksToRun.get(sessionCheck.id as string);
					if (!runDef) continue;

					const result = await runDef.checkDef.handler(
						ctx,
						runDef.sessionParams,
						data,
					);

					const prev = this.checkResults.get(sessionCheck.id as string);
					if (prev !== result) {
						this.checkResults.set(sessionCheck.id as string, result);
						for (const cb of this.onChangeCallbacks) {
							cb(sessionCheck.id as string, result);
						}
					}
				}
			};
			emitters.push(checkCb);

			// Track local cleanup
			this.sessionEmitterCleanups.push(() => {
				const currentEmitters = this.evaluator._emitters.get(sourceKey);
				if (currentEmitters) {
					const idx = currentEmitters.indexOf(checkCb);
					if (idx !== -1) currentEmitters.splice(idx, 1);
					if (currentEmitters.length === 0)
						this.evaluator._emitters.delete(sourceKey);
				}
			});
		}

		// Setup subscribe function
		const subscribe = async (
			targetSId: string,
			cb: (data: any) => void | Promise<void>,
		) => {
			const targetSourceId = `${hId}.${targetSId}`;
			const targetKey = `${targetSourceId}::${nodeId}`;

			let targetEmitters = this.evaluator._emitters.get(targetKey);
			if (!targetEmitters) {
				targetEmitters = [];
				this.evaluator._emitters.set(targetKey, targetEmitters);
			}
			targetEmitters.push(cb);

			await this.startSource(nodeId, targetSourceId); // Recursively start the dependency

			const cleanup = () => {
				const currentEmitters = this.evaluator._emitters.get(targetKey);
				if (currentEmitters) {
					const idx = currentEmitters.indexOf(cb);
					if (idx !== -1) currentEmitters.splice(idx, 1);
					if (currentEmitters.length === 0)
						this.evaluator._emitters.delete(targetKey);
				}
			};

			// Backup tracker just in case user listen functions fail to invoke cleanup
			this.sessionEmitterCleanups.push(cleanup);
			return cleanup;
		};

		// Setup the source's actual listener
		if (sourceDef.listen) {
			try {
				// notify routes the data to `emitSource`, which hits ALL emitters (checks + subscribers)
				const notifyFn = (data: any) =>
					this.evaluator.emitSource(nodeId, sourceId as any, data);
				const cleanupListener = await sourceDef.listen(
					ctx,
					notifyFn,
					subscribe,
				);
				if (cleanupListener) {
					this.listeners.set(sourceKey, cleanupListener);
				}
			} catch (err) {
				console.error(`Failed to setup listen for ${sourceKey}`, err);
			}
		}
	}

	async start() {
		// Start listeners only for sources that are actively used by our checks
		// This will recursively start dependent sources via startSource and subscribe
		const promises = [];

		for (const sourceKey of this.sourceToCheckMap.keys()) {
			const [sourceId, nodeId] = sourceKey.split("::");
			if (!sourceId || !nodeId) continue;

			if (this.healthHooks && !this.healthHooks.isNodeHealthy(nodeId)) {
				this.startSource(nodeId, sourceId).catch((err) =>
					console.error(
						`Error starting source ${sourceKey} in background:`,
						err,
					),
				);
			} else {
				promises.push(this.startSource(nodeId, sourceId));
			}
		}

		await Promise.all(promises);
	}

	async check() {
		// Optimization: Cache source data so we only call read() once per source per `check()` cycle
		const sourceDataCache = new Map<string, any>();

		for (const [sourceKey, activeChecks] of this.sourceToCheckMap.entries()) {
			const [sourceId, nodeId] = sourceKey.split("::");
			if (!sourceId || !nodeId) continue;

			if (this.healthHooks && !this.healthHooks.isNodeHealthy(nodeId)) continue;

			const [hId, sId] = sourceId.split(".");
			if (!hId || !sId) continue;

			const handler = this.evaluator.handlers[hId];
			if (!handler) continue;

			const sourceDef = handler._sources[sId];
			if (!sourceDef) continue;

			const ctx = await this.getContext(nodeId, hId);

			// Find correct read function (handle override)
			const readFn =
				this.evaluator._readOverrides.get(sourceId) || sourceDef.read;

			if (!readFn) continue;

			// Call read once, evaluate all dependent checks
			try {
				let data = sourceDataCache.get(sourceKey);
				if (!data) {
					data = await readFn(ctx);
					sourceDataCache.set(sourceKey, data);
				}

				for (const sessionCheck of activeChecks) {
					const runDef = this.checksToRun.get(sessionCheck.id as string);
					if (!runDef) continue;

					const result = await runDef.checkDef.handler(
						ctx,
						runDef.sessionParams,
						data,
					);

					const prev = this.checkResults.get(sessionCheck.id as string);
					if (prev !== result) {
						this.checkResults.set(sessionCheck.id as string, result);
						for (const cb of this.onChangeCallbacks) {
							cb(sessionCheck.id as string, result);
						}
					}
				}
			} catch (err) {
				console.error(
					`Error reading source ${sourceId} on node ${nodeId}:`,
					err,
				);
			}
		}
	}

	async stop() {
		// Run all listener cleanups
		for (const cleanup of this.listeners.values()) {
			await cleanup();
		}
		this.listeners.clear();

		// Run all context cleanups
		for (const cleanup of this.cleanups.values()) {
			await cleanup();
		}
		this.cleanups.clear();
		this.contexts.clear();
		this.startedSources.clear();

		// Cleanup Emitters
		for (const cleanup of this.sessionEmitterCleanups) {
			cleanup();
		}
		this.sessionEmitterCleanups = [];
	}
}
