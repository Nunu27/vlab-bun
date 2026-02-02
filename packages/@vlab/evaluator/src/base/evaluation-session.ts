import type Docker from "dockerode";
import type { RegistryItem, SessionCheckConfig, VoidCallback } from "../types";
import type { Evaluator } from "./evaluator";

export class EvaluationSession<TRegistry extends Record<string, RegistryItem>> {
	private cleanups: Array<VoidCallback> = [];
	private latestValues = new Map<string, boolean>();
	private changeListeners: Array<(id: string, value: boolean) => void> = [];
	private isStarted = false;

	constructor(
		private evaluator: Evaluator<TRegistry>,
		private docker: Docker,
		private checks: SessionCheckConfig<TRegistry>[],
	) {}

	onChange(callback: (id: string, value: boolean) => void) {
		this.changeListeners.push(callback);
		return this;
	}

	private notifyChange(id: string, value: boolean) {
		// Only trigger listeners if the value actually changed
		if (this.latestValues.get(id) !== value) {
			this.latestValues.set(id, value);
			for (const listener of this.changeListeners) {
				listener(id, value);
			}
		}
	}

	async check() {
		const results: Record<string, boolean> = {};

		for (const config of this.checks) {
			const [handlerId, checkId] = config.checkerId.split(".");
			if (!handlerId || !checkId) continue;

			const handler = this.evaluator.handlers.get(handlerId);
			if (!handler) continue;

			const checkDef = handler.checks.get(checkId);
			if (!checkDef) continue;

			const sourceDef = handler.sources.get(checkDef.source);
			if (!sourceDef) continue;

			if (sourceDef.read) {
				const sourceParams = checkDef.sourceParamsBuilder({
					nodeId: config.nodeId,
					params: config.params,
				});
				const data = await sourceDef.read({
					docker: this.docker,
					nodeId: config.nodeId,
					params: sourceParams,
				});
				const result = await checkDef.handler({
					nodeId: config.nodeId,
					params: config.params,
					data,
				});

				results[config.id] = result;
				this.notifyChange(config.id, result);
			}
		}
		return results;
	}

	async start() {
		if (this.isStarted) return;
		this.isStarted = true;

		for (const config of this.checks) {
			const [handlerId, checkId] = config.checkerId.split(".");
			if (!handlerId || !checkId) continue;

			const handler = this.evaluator.handlers.get(handlerId);
			if (!handler) continue;

			const checkDef = handler.checks.get(checkId);
			if (!checkDef) continue;

			const sourceDef = handler.sources.get(checkDef.source);
			if (!sourceDef) continue;

			if (sourceDef.listen) {
				const sourceParams = checkDef.sourceParamsBuilder({
					nodeId: config.nodeId,
					params: config.params,
				});

				// Initialize the listener and save the cleanup function
				const cleanup = sourceDef.listen({
					docker: this.docker,
					nodeId: config.nodeId,
					params: sourceParams,
					notify: async (data) => {
						const result = await checkDef.handler({
							nodeId: config.nodeId,
							params: config.params,
							data,
						});
						this.notifyChange(config.id, result);
					},
				});

				if (cleanup) {
					this.cleanups.push(cleanup);
				}
			}
		}
	}

	stop() {
		if (!this.isStarted) return;

		for (const cleanup of this.cleanups) {
			cleanup();
		}
		this.cleanups = [];
		this.isStarted = false;
	}
}
