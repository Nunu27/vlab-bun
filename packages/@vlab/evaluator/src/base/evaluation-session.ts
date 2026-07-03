/** biome-ignore-all lint/suspicious/noExplicitAny: loose typing */
import type Dockerode from "dockerode";
import type {
	AnyHandler,
	BaseContext,
	NodeInfo,
	SessionCheckPayload,
} from "../types";
import { withRetry } from "../utils";
import type { Evaluator } from "./evaluator";

// After this many consecutive failures against a cached context, the context
// is torn down and rebuilt from scratch (e.g. forces a fresh RouterOS
// connect+login) instead of continuing to reuse a possibly-broken resource.
const CONTEXT_FAILURE_THRESHOLD = 3;

// Unbounded: a source keeps retrying (capped backoff) until it connects or
// the session stops (retryAbort); there's no other event that would tell us
// a slow-booting node is never coming up.
const SOURCE_START_RETRIES = Number.POSITIVE_INFINITY;
const SOURCE_START_MIN_DELAY_MS = 500;
const SOURCE_START_MAX_DELAY_MS = 15_000;

export class EvaluationSession<THandlers extends Record<string, AnyHandler>> {
	private checkDefinitions: SessionCheckPayload<THandlers>[];

	// State maps
	private contexts = new Map<string, any>();
	private cleanups = new Map<string, () => void | Promise<void>>();
	private listeners = new Map<string, () => void | Promise<void>>(); // Cleanups for sources
	private checkResults = new Map<string, boolean>();
	private onChangeCallbacks: Array<(checkId: string, result: boolean) => void> =
		[];
	private onSourceErrorCallbacks: Array<
		(sourceKey: string, error: unknown) => void
	> = [];
	private startedSources = new Set<string>();
	private startingSources = new Set<string>();

	// Keyed by `${nodeId}::${handlerId}`.
	private contextFailures = new Map<string, number>();

	// Tracks emitter callbacks registered by this session, for cleanup
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

	// Per-check emitter removal callbacks, used to stop oneTime checks from listening
	private checkEmitterRemovals = new Map<string, () => void>();
	// Keyed by sourceKey. Kept separate from checkEmitterRemovals so tearing
	// a source down on reconnect doesn't disturb other sources subscribed to
	// the same emitter (e.g. via `subscribe`).
	private sourceCheckRemovals = new Map<string, () => void>();
	private stopped = false;

	private retryAbort = new AbortController();

	constructor(
		private evaluator: Evaluator<THandlers>,
		private docker: Dockerode,
		private nodeMapping: Record<string, NodeInfo>,
		checks: SessionCheckPayload<THandlers>[],
		private healthHooks?: {
			isNodeHealthy: (nodeId: string) => boolean;
			waitForHealth: (
				nodeId: string,
				timeoutMs?: number,
				signal?: AbortSignal,
			) => Promise<void>;
		},
		initialValues?: Record<string, boolean>,
	) {
		this.checkDefinitions = checks;
		if (initialValues) {
			for (const [id, value] of Object.entries(initialValues)) {
				this.checkResults.set(id, value);
			}
		}
		this.mapDependencies();
	}

	private mapDependencies() {
		for (const sessionCheck of this.checkDefinitions) {
			const [hId, cId] = sessionCheck.checkId.split(".");
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
			this.checksToRun.set(sessionCheck.id, {
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

	/**
	 * Tears down and forgets a cached context so the next `getContext` call
	 * rebuilds it from scratch (e.g. a fresh RouterOS connect+login).
	 */
	private async invalidateContext(contextKey: string) {
		this.contextFailures.delete(contextKey);
		const cleanup = this.cleanups.get(contextKey);
		this.cleanups.delete(contextKey);
		this.contexts.delete(contextKey);
		if (cleanup) {
			try {
				await cleanup();
			} catch (error) {
				console.error(
					`Error cleaning up invalidated context ${contextKey}:`,
					error,
				);
			}
		}
	}

	private recordContextFailure(contextKey: string) {
		const count = (this.contextFailures.get(contextKey) ?? 0) + 1;
		this.contextFailures.set(contextKey, count);
		if (count >= CONTEXT_FAILURE_THRESHOLD) {
			void this.invalidateContext(contextKey);
		}
	}

	private recordContextSuccess(contextKey: string) {
		this.contextFailures.delete(contextKey);
	}

	/**
	 * Blocks until `nodeId` is confirmed healthy, the session stops, or this
	 * node's wait is cancelled. Returns false in the latter two cases so the
	 * caller can bail out instead of starting a source against a node that
	 * was never confirmed ready. A node reporting `unhealthy` keeps waiting
	 * for its next transition rather than giving up, since Docker health
	 * checks commonly flap during boot.
	 */
	private async waitNodeHealth(nodeId: string): Promise<boolean> {
		if (!this.healthHooks) return true;
		if (this.healthHooks.isNodeHealthy(nodeId)) return true;

		const controller = new AbortController();
		this.cleanups.set(`health-wait::${nodeId}`, () => controller.abort());

		try {
			while (!controller.signal.aborted && !this.stopped) {
				try {
					// No timeout: wait purely on health events/abort so a source
					// never starts before the node is actually confirmed healthy.
					await this.healthHooks.waitForHealth(nodeId, 0, controller.signal);
					return true;
				} catch (error) {
					if (controller.signal.aborted || this.stopped) return false;
					console.warn(
						`Node ${nodeId} reported unhealthy while waiting to start a source, still waiting:`,
						error,
					);
				}
			}
			return false;
		} finally {
			this.cleanups.delete(`health-wait::${nodeId}`);
		}
	}

	onChange(cb: (checkId: string, result: boolean) => void) {
		this.onChangeCallbacks.push(cb);
	}

	/**
	 * Notified whenever a source fails to start (after exhausting retries) or
	 * dies later on. Purely observational: does not affect retry/reconnect
	 * behavior, which happens regardless of whether a listener is registered.
	 */
	onSourceError(cb: (sourceKey: string, error: unknown) => void) {
		this.onSourceErrorCallbacks.push(cb);
	}

	private notifySourceError(sourceKey: string, error: unknown) {
		for (const cb of this.onSourceErrorCallbacks) {
			cb(sourceKey, error);
		}
	}

	/**
	 * Evaluates a single check against pre-fetched source data and updates state.
	 * If the check is `oneTime` and just resolved to `true`, it removes itself from
	 * the emitter so the listener stops firing for this check going forward.
	 */
	private async evaluateCheck(
		sessionCheck: SessionCheckPayload<THandlers>,
		ctx: any,
		data: any,
	) {
		const runDef = this.checksToRun.get(sessionCheck.id);
		if (!runDef) return;

		// oneTime checks that are already true: remove their listener and skip
		if (
			runDef.checkDef.oneTime &&
			this.checkResults.get(sessionCheck.id) === true
		) {
			this.removeCheckFromEmitter(sessionCheck.id);
			return;
		}

		const result = await runDef.checkDef.handler(
			ctx,
			runDef.sessionParams,
			data,
		);

		const prev = this.checkResults.get(sessionCheck.id);
		if (prev !== result) {
			this.checkResults.set(sessionCheck.id, result);
			for (const cb of this.onChangeCallbacks) {
				cb(sessionCheck.id, result);
			}

			// oneTime check just became true, stop listening immediately
			if (runDef.checkDef.oneTime && result === true) {
				this.removeCheckFromEmitter(sessionCheck.id);
			}
		}
	}

	private async evaluateCheckSafely(
		sessionCheck: SessionCheckPayload<THandlers>,
		ctx: any,
		data: any,
	) {
		try {
			await this.evaluateCheck(sessionCheck, ctx, data);
		} catch (error) {
			console.error(`Error evaluating check ${sessionCheck.id}:`, error);
		}
	}

	/**
	 * Removes a specific check's callback from the shared emitter so the source
	 * no longer triggers evaluation for this check.
	 */
	private removeCheckFromEmitter(checkId: string) {
		const remove = this.checkEmitterRemovals.get(checkId);
		if (remove) {
			remove();
			this.checkEmitterRemovals.delete(checkId);
		}
	}

	/**
	 * Registers the check-evaluation callback for a source's own directly
	 * mapped checks onto the shared emitter. Returns a removal function scoped
	 * to just this callback (cross-source `subscribe` listeners on the same
	 * emitter are left untouched).
	 */
	private registerSourceCheckEmitter(sourceKey: string, ctx: any) {
		const activeChecks = this.sourceToCheckMap.get(sourceKey) || [];
		if (activeChecks.length === 0) return;

		let emitters = this.evaluator._emitters.get(sourceKey);
		if (!emitters) {
			emitters = [];
			this.evaluator._emitters.set(sourceKey, emitters);
		}

		const checkCb = async (data: any) => {
			for (const sessionCheck of activeChecks) {
				await this.evaluateCheckSafely(sessionCheck, ctx, data);
			}
		};
		emitters.push(checkCb);

		const removeFromEmitter = () => {
			const currentEmitters = this.evaluator._emitters.get(sourceKey);
			if (currentEmitters) {
				const idx = currentEmitters.indexOf(checkCb);
				if (idx !== -1) currentEmitters.splice(idx, 1);
				if (currentEmitters.length === 0)
					this.evaluator._emitters.delete(sourceKey);
			}
		};

		for (const sessionCheck of activeChecks) {
			this.checkEmitterRemovals.set(sessionCheck.id, removeFromEmitter);
		}
		this.sourceCheckRemovals.set(sourceKey, removeFromEmitter);
		this.sessionEmitterCleanups.push(removeFromEmitter);
	}

	/** Reacts to a source failing by tearing it down and re-attempting `startSource`; no polling involved. */
	private async recoverSource(
		nodeId: string,
		sourceId: string,
		error: unknown,
	) {
		const sourceKey = `${sourceId}::${nodeId}`;
		if (!this.startedSources.has(sourceKey)) return; // already torn down/never started
		this.startedSources.delete(sourceKey);

		const cleanup = this.listeners.get(sourceKey);
		this.listeners.delete(sourceKey);
		if (cleanup) {
			try {
				await cleanup();
			} catch (cleanupError) {
				console.error(
					`Error cleaning up failed source ${sourceKey}:`,
					cleanupError,
				);
			}
		}

		const removeCheckCb = this.sourceCheckRemovals.get(sourceKey);
		if (removeCheckCb) {
			removeCheckCb();
			this.sourceCheckRemovals.delete(sourceKey);
		}

		const [hId] = sourceId.split(".");
		if (hId) this.recordContextFailure(`${nodeId}::${hId}`);

		console.error(
			`Source ${sourceKey} failed, will attempt to reconnect:`,
			error,
		);
		this.notifySourceError(sourceKey, error);

		if (this.stopped) return;
		this.startSource(nodeId, sourceId).catch((err) => {
			console.error(`Failed to reconnect source ${sourceKey}:`, err);
		});
	}

	private async startSource(nodeId: string, sourceId: string) {
		const sourceKey = `${sourceId}::${nodeId}`;
		if (this.stopped) return;
		if (
			this.startedSources.has(sourceKey) ||
			this.startingSources.has(sourceKey)
		)
			return;
		this.startingSources.add(sourceKey);

		try {
			const [hId, sId] = sourceId.split(".");
			if (!hId || !sId) return;

			const handler = this.evaluator.handlers[hId];
			if (!handler) return;

			const sourceDef = handler._sources[sId];
			if (!sourceDef) return;

			const becameHealthy = await this.waitNodeHealth(nodeId);
			if (!becameHealthy || this.stopped) return;

			let ctx: any;
			let cleanupListener: (() => void) | undefined;

			// Setup subscribe function (for sources that depend on other sources)
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

			try {
				await withRetry(
					async () => {
						ctx = await this.getContext(nodeId, hId);

						if (sourceDef.listen) {
							const notifyFn = (data: any) => {
								if (this.stopped) return;
								this.evaluator.emitSource(nodeId, sourceId as any, data);
							};
							const reportError = (error?: unknown) => {
								this.recoverSource(
									nodeId,
									sourceId,
									error ?? new Error("Source reported an error"),
								).catch((err) =>
									console.error(`Error recovering source ${sourceKey}:`, err),
								);
							};
							cleanupListener = await sourceDef.listen(ctx, {
								notify: notifyFn,
								subscribe,
								reportError,
							});
						}
					},
					{
						retries: SOURCE_START_RETRIES,
						minDelayMs: SOURCE_START_MIN_DELAY_MS,
						maxDelayMs: SOURCE_START_MAX_DELAY_MS,
						signal: this.retryAbort.signal,
						onAttemptFailed: (error, attempt) => {
							console.error(
								`Attempt ${attempt} failed to start source ${sourceKey}:`,
								error,
							);
						},
					},
				);
			} catch (error) {
				this.recordContextFailure(`${nodeId}::${hId}`);
				this.notifySourceError(sourceKey, error);
				return;
			}

			if (this.stopped) {
				// Session stopped while we were retrying: undo what we just set up.
				if (cleanupListener) await cleanupListener();
				return;
			}

			this.recordContextSuccess(`${nodeId}::${hId}`);
			this.startedSources.add(sourceKey);
			this.registerSourceCheckEmitter(sourceKey, ctx);
			if (cleanupListener) {
				this.listeners.set(sourceKey, cleanupListener);
			}
		} finally {
			this.startingSources.delete(sourceKey);
		}
	}

	async start() {
		this.stopped = false;
		// Start listeners only for sources that are actively used by our checks.
		// This will recursively start dependent sources via startSource and subscribe.
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
		if (this.stopped) return;

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

			const contextKey = `${nodeId}::${hId}`;

			// getContext is inside this try too, so one node with a dead context
			// doesn't abort the cycle for unrelated nodes/sources.
			try {
				const ctx = await this.getContext(nodeId, hId);

				// Find correct read function (handle override)
				const readFn =
					this.evaluator._readOverrides.get(sourceId) || sourceDef.read;
				if (!readFn) continue;

				let data = sourceDataCache.get(sourceKey);
				if (!data) {
					data = await readFn(ctx);
					sourceDataCache.set(sourceKey, data);
				}

				this.recordContextSuccess(contextKey);

				for (const sessionCheck of activeChecks) {
					await this.evaluateCheckSafely(sessionCheck, ctx, data);
				}
			} catch (err) {
				console.error(
					`Error reading source ${sourceId} on node ${nodeId}:`,
					err,
				);
				this.recordContextFailure(contextKey);
				this.notifySourceError(sourceKey, err);
			}
		}
	}

	async stop() {
		this.stopped = true;
		this.retryAbort.abort();

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
		this.contextFailures.clear();
		this.startedSources.clear();
		this.startingSources.clear();

		// Cleanup emitters
		for (const cleanup of this.sessionEmitterCleanups) {
			cleanup();
		}
		this.sessionEmitterCleanups = [];
		this.checkEmitterRemovals.clear();
		this.sourceCheckRemovals.clear();
	}
}
