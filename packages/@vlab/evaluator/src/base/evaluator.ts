/** biome-ignore-all lint/suspicious/noExplicitAny: loose typing */
/** biome-ignore-all lint/complexity/noBannedTypes: default generics */
import { type TObject, type TProperties, Type } from "@sinclair/typebox";
import type Dockerode from "dockerode";
import type {
	AnyHandler,
	ExtractContext,
	ExtractSourceData,
	ExtractValidSourceIds,
	NodeInfo,
	SessionCheckPayload,
} from "../types";
import { EvaluationSession } from "./evaluation-session";

export class Evaluator<THandlers extends Record<string, AnyHandler> = {}> {
	public handlers: THandlers = {} as THandlers;

	// Internal overrides
	public _readOverrides = new Map<string, (ctx: any) => any>();
	public _emitters = new Map<
		string,
		Array<(data: any) => void | Promise<void>>
	>();

	register<H extends AnyHandler>(
		handler: H,
	): Evaluator<THandlers & Record<H["id"], H>> {
		(this.handlers as any)[handler.id] = handler;
		return this as unknown as Evaluator<THandlers & Record<H["id"], H>>;
	}

	getChecks() {
		const result: {
			handlers: Record<string, { kinds: string[]; checks: string[] }>;
			checks: Record<string, { name: string; params: TObject }>;
		} = { handlers: {}, checks: {} };

		for (const [hId, handler] of Object.entries(this.handlers)) {
			result.handlers[hId] = {
				kinds: handler._kinds,
				checks: Object.keys(handler._checks),
			};

			for (const [cId, checkData] of Object.entries(handler._checks)) {
				result.checks[`${hId}.${cId}`] = {
					name: checkData.name,
					params: Type.Object(checkData.params as TProperties, {
						title: checkData.text as string,
					}),
				};
			}
		}
		return result;
	}

	// Strongly typed TargetId and typed read function arguments
	setSourceRead<TargetId extends ExtractValidSourceIds<THandlers>>(
		sourceId: TargetId,
		read: (
			ctx: ExtractContext<THandlers, TargetId>,
		) =>
			| ExtractSourceData<THandlers, TargetId>
			| Promise<ExtractSourceData<THandlers, TargetId>>,
	) {
		this._readOverrides.set(sourceId as string, read);
	}

	// Strongly typed Event Emitter
	emitSource<TargetId extends ExtractValidSourceIds<THandlers>>(
		nodeId: string,
		sourceId: TargetId,
		data: ExtractSourceData<THandlers, TargetId>,
	) {
		const listeners = this._emitters.get(`${sourceId as string}::${nodeId}`);
		if (listeners) {
			for (const fn of listeners) {
				void fn(data);
			}
		}
	}

	createSession(
		docker: Dockerode,
		nodeMapping: Record<string, NodeInfo>,
		checks: SessionCheckPayload<THandlers>[],
		healthHooks?: {
			isNodeHealthy: (nodeId: string) => boolean;
			waitForHealth: (nodeId: string, onHealthy: () => void) => () => void;
		},
		initialValues?: Record<string, boolean>,
	) {
		return new EvaluationSession(
			this,
			docker,
			nodeMapping,
			checks,
			healthHooks,
			initialValues,
		);
	}
}
