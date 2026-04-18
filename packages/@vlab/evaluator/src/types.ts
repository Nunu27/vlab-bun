/** biome-ignore-all lint/suspicious/noExplicitAny: loose typing */

import type { Static, TObject, TProperties } from "@sinclair/typebox/type";
import type Dockerode from "dockerode";
import type { EvaluationHandler } from "./base/evaluation-handler";

export interface NodeInfo {
	id: string;
	ip: string;
	containerId: string;
}

export interface BaseContext {
	docker: Dockerode;
	node: NodeInfo;
}

export type AnyHandler = EvaluationHandler<string, any, any, any>;

export type ExtractValidSourceIds<
	THandlers extends Record<string, AnyHandler>,
> = {
	[HId in keyof THandlers]: keyof THandlers[HId]["__sources"] extends never
		? never
		: keyof THandlers[HId]["__sources"] extends string
			? `${HId & string}.${keyof THandlers[HId]["__sources"] & string}`
			: never;
}[keyof THandlers];

export type ExtractSourceData<
	THandlers extends Record<string, AnyHandler>,
	TargetId extends string,
> = TargetId extends `${infer HId}.${infer SId}`
	? HId extends keyof THandlers
		? SId extends keyof THandlers[HId]["__sources"]
			? Static<THandlers[HId]["__sources"][SId]>
			: never
		: never
	: never;

export type SessionCheckPayload<THandlers extends Record<string, AnyHandler>> =
	{
		[HId in keyof THandlers]: keyof THandlers[HId]["__checks"] extends never
			? never
			: {
					[CId in keyof THandlers[HId]["__checks"]]: {
						id: string;
						nodeId: string;
						checkId: `${HId & string}.${CId & string}`;
						params: THandlers[HId]["__checks"][CId] extends TProperties
							? Static<TObject<THandlers[HId]["__checks"][CId]>>
							: never;
					};
				}[keyof THandlers[HId]["__checks"]];
	}[keyof THandlers];

export type ExtractContext<
	THandlers extends Record<string, AnyHandler>,
	TargetId extends string,
> = TargetId extends `${infer HId}.${string}`
	? HId extends keyof THandlers
		? BaseContext & THandlers[HId]["__context"]
		: BaseContext
	: BaseContext;
