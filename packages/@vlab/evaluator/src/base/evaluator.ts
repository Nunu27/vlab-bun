import { EventEmitter } from "node:events";
import { Type as t } from "@sinclair/typebox";
import type { Static, TObject, TProperties } from "@sinclair/typebox/type";
import type Docker from "dockerode";
import type {
	BaseChecks,
	BaseSources,
	MaybePromise,
	RegistryItem,
	SessionCheckConfig,
} from "../types";
import type { EvaluationHandler } from "./evaluation-handler";
import { EvaluationSession } from "./evaluation-session";

export class Evaluator<
	TRegistry extends Record<string, RegistryItem> = Record<string, never>,
> {
	public readonly handlers = new Map<
		string,
		EvaluationHandler<string, BaseSources, BaseChecks>
	>();

	private readonly emitter = new EventEmitter();

	register<
		TId extends string,
		TSources extends BaseSources,
		TChecks extends BaseChecks,
		TAddition extends Record<string, RegistryItem> = Record<
			TId,
			{ sources: TSources; checks: TChecks }
		>,
	>(handler: EvaluationHandler<TId, TSources, TChecks>) {
		this.handlers.set(handler.id, handler);

		return this as unknown as TRegistry extends Record<string, never>
			? Evaluator<TAddition>
			: Evaluator<TRegistry & TAddition>;
	}

	createSession(docker: Docker, checks: SessionCheckConfig<TRegistry>[]) {
		return new EvaluationSession(this, docker, checks);
	}

	getRegisteredChecks() {
		const handlers: Record<string, { kinds: string[]; checks: string[] }> = {};
		const checks: Record<
			string,
			{ name: string; params: TObject<TProperties> }
		> = {};

		for (const [handlerId, handler] of this.handlers.entries()) {
			handlers[handlerId] = {
				kinds: handler.kinds,
				checks: Array.from(handler.checks.keys()),
			};
			for (const [checkId, checkConfig] of handler.checks.entries()) {
				checks[`${handlerId}.${checkId}`] = {
					name: checkConfig.name,
					params: t.Object(checkConfig.params, {
						title: checkConfig.text,
					}),
				};
			}
		}
		return { handlers, checks };
	}

	private serializeKey(event: string, nodeId: string, params: object): string {
		return `${event}::${nodeId}::${JSON.stringify(params, Object.keys(params).sort())}`;
	}

	setSourceRead<
		THandlerId extends keyof TRegistry & string,
		TSourceName extends keyof TRegistry[THandlerId]["sources"] & string,
		TSources extends BaseSources = TRegistry[THandlerId]["sources"],
		TStaticSourceParams extends object = Static<
			TObject<TSources[TSourceName]["params"]>
		>,
		TStaticSourceData = Static<TSources[TSourceName]["data"]>,
	>(
		handlerId: THandlerId,
		sourceName: TSourceName,
		readFn: (args: {
			docker: Docker;
			nodeId: string;
			params: TStaticSourceParams;
		}) => MaybePromise<TStaticSourceData>,
	): this {
		const handler = this.handlers.get(handlerId);
		if (handler) {
			const source = handler.sources.get(sourceName);
			if (source) {
				source.read = readFn as any;
			}
		}
		return this;
	}

	on<
		THandlerId extends keyof TRegistry & string,
		TSourceName extends keyof TRegistry[THandlerId]["sources"] & string,
		TSources extends BaseSources = TRegistry[THandlerId]["sources"],
		TStaticSourceParams extends object = Static<
			TObject<TSources[TSourceName]["params"]>
		>,
		TStaticSourceData = Static<TSources[TSourceName]["data"]>,
	>(
		event: `${THandlerId}.${TSourceName}`,
		nodeId: string,
		params: TStaticSourceParams,
		listener: (data: TStaticSourceData) => void,
	): this {
		this.emitter.on(this.serializeKey(event, nodeId, params), listener);
		return this;
	}

	off<
		THandlerId extends keyof TRegistry & string,
		TSourceName extends keyof TRegistry[THandlerId]["sources"] & string,
		TSources extends BaseSources = TRegistry[THandlerId]["sources"],
		TStaticSourceParams extends object = Static<
			TObject<TSources[TSourceName]["params"]>
		>,
		TStaticSourceData = Static<TSources[TSourceName]["data"]>,
	>(
		event: `${THandlerId}.${TSourceName}`,
		nodeId: string,
		params: TStaticSourceParams,
		listener: (data: TStaticSourceData) => void,
	): this {
		this.emitter.removeListener(
			this.serializeKey(event, nodeId, params),
			listener,
		);
		return this;
	}

	emit<
		THandlerId extends keyof TRegistry & string,
		TSourceName extends keyof TRegistry[THandlerId]["sources"] & string,
		TSources extends BaseSources = TRegistry[THandlerId]["sources"],
		TStaticSourceParams extends object = Static<
			TObject<TSources[TSourceName]["params"]>
		>,
		TStaticSourceData = Static<TSources[TSourceName]["data"]>,
	>(
		event: `${THandlerId}.${TSourceName}`,
		nodeId: string,
		params: TStaticSourceParams,
		data: TStaticSourceData,
	): this {
		this.emitter.emit(this.serializeKey(event, nodeId, params), data);
		return this;
	}
}
