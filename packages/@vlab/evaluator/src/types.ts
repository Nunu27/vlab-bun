import type {
	Static,
	TObject,
	TProperties,
	TSchema,
} from "@sinclair/typebox/type";
import type Dockerode from "dockerode";

export type VoidCallback = () => void;
export type MaybePromise<T> = T | Promise<T>;

export type SourceConfig<
	TParams extends TProperties,
	TData extends TSchema,
	TStaticParams = Static<TObject<TParams>>,
	TStaticData = Static<TData>,
> = {
	params: TParams;
	data: TData;
	listen?: (args: {
		docker: Dockerode;
		nodeId: string;
		params: TStaticParams;
		notify: (data: TStaticData) => void;
	}) => VoidCallback;
	read?: (args: {
		docker: Dockerode;
		nodeId: string;
		params: TStaticParams;
	}) => MaybePromise<TStaticData>;
};

export type CheckConfig<
	TSource extends string,
	TParams extends TProperties,
	TSourceParams extends TProperties,
	TSourceData extends TSchema,
	TStaticParams = Static<TObject<TParams>>,
	TStaticSourceParams = Static<TObject<TSourceParams>>,
	TStaticSourceData = Static<TSourceData>,
> = {
	name: string;
	text: string;
	source: TSource;
	params: TParams;
	sourceParamsBuilder: (args: {
		nodeId: string;
		params: TStaticParams;
	}) => TStaticSourceParams;
	handler: (args: {
		nodeId: string;
		params: TStaticParams;
		data: TStaticSourceData;
	}) => MaybePromise<boolean>;
};

export type BaseSources = Record<
	string,
	{ params: TProperties; data: TSchema }
>;
export type BaseChecks = Record<string, { params: TProperties }>;

export interface RegistryItem {
	sources: BaseSources;
	checks: BaseChecks;
}

export type SessionCheckConfig<TRegistry extends Record<string, RegistryItem>> =
	{
		[THandlerId in keyof TRegistry & string]: {
			[TCheckId in keyof TRegistry[THandlerId]["checks"] & string]: {
				id: string;
				checkId: `${THandlerId}.${TCheckId}`;
				nodeId: string;
				params: Static<
					TObject<TRegistry[THandlerId]["checks"][TCheckId]["params"]>
				>;
			};
		}[keyof TRegistry[THandlerId]["checks"] & string];
	}[keyof TRegistry & string];
